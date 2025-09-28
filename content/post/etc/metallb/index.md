---
title: Metallb
description: 방구석 k8s도 로드 밸런서는 필요해요
slug: etc/metallb
date: 2025-09-28 20:22:00+0900
image: cover.png
categories:
    - 이모저모
tags:
    - Kubernetes
weight: 1
---

### 배경
회사 업무 외적으로 내가 개인적으로 소유·관리하는 k8s 클러스터는 두 개다.
- **OKE**: Oracle에서 운영하는 KaaS.
  - 클라우드 환경답게 기본 L4/L7 Load Balancer가 제공된다.
- **On-Premise**: 새로 컴퓨터 사면서 기존에 가지고 있던 PC에 Linux를 설치해 싱글 노드 k8s 형태로 운영.
  - Oracle에서 무료로 제공되는 용량을 아득히 초과하는 서비스, 예를들어 ```Jellyfin```이나 ```7 Days To Die```, ```Ollama```, ```QBittorrent```등 GPU가 필요하거나, 저장 공간 혹은 메모리를 엄청나게 잡아먹거나, 네트워크 리소스를 물 쓰듯이 쓰는 애들이 올라간다.
  - OKE에서는 기본 LB가 제공되지만, 방구석 클러스터에는 외부 트래픽을 받아줄 Load Balancer가 없다.

<br>
<p align='center'>
    <img src="jellyfin.png" alt>
    <em>만일 Jellyfin같은 앱을 클라우드에 있는 k8s에 설치했다간 네트워크 비용만으로도 허리가 휠 것이다.</em>
</p>
<br>
<br>

### 문제의 시작

>&emsp;**어차피 노드 하나잖아? 없어도 그만 아닌가?**

이게 꼭 그렇지만도 않다. 지금이야 노드가 1개지만, 앞으로 계속 늘어날텐데?

우선, 우리 집의 내부망 대역은 ```93.5.22.0/24```이다. 

Worker Node의 IP는 ```93.5.22.44```로 고정해놨다.

공유기는 외부에서 받은 ```80/443``` TCP (http/https) 요청을 ```93.5.22.44```의 ```80/443``` 포트로
포워딩 해주고, k8s 안에 있는 ingress controller가 요청한 도메인에 따라 각기 다른 서비스로 매핑해준다.

만일 새로운 Worker Node 2와 3이 추가되었다고 해보자. 

새로운 Node의 IP는 각각 ```93.5.22.45```, ```93.5.22.46```이다.

<p align='center'>
    <img src="cannot-route.png" alt>
    <em>공유기는 대체 어느 Node로 포워딩을 해야하는가?</em>
</p>

<br>
<br>

### 애초에 로드밸런서가 뭐지? 하드웨어인가?

AWS나 OCI같은 클라우드 서비스만 썼을 때는 전혀 해보지 않았던 고민이다.

거기서는 CP들이 그냥 원하면 언제든 쓸 수 있게 준비를 다 해놨으니까.

결론부터 얘기하자면, 아예 LB의 역할을 하는 하드웨어도 물론 존재한다고 하는데,

굳이 그런걸 사서 쓸 필요는 없다. ```Metallb```을 사용하면 된다.

<br><br>

### Metallb이란?
```Metallb```은 Bare**Metal** **L**oad**B**alancer의 약자이다. 문자 그대로 On-Premise 환경에서도

AWS나 Azure에서 쓰던 것과 같이 LB를 사용할 수 있게 해주는 서비스이다.

[공식 문서](https://metallb.universe.tf/installation/clouds/)에 따르면 ```Metallb```는 대부분의 클라우드에서는 지원되지 않는다. 

| Cloud platform | Supported |
| --- | --- |
| AWS | No, use EKS |
| Azure | No, use AKS |
| DigitalOcean | No, use DigitalOcean Kubernetes |
| Equinix Metal | Yes, see Equinix Metal notes |
| Google Cloud | No, use GKE |
| Hetzner | Yes, see Hetzner notes |
| OVH | Yes, when using a vRack |
| OpenShift OCP | Yes, see OpenShift notes |
| OpenStack | Yes, see OpenStack notes |
| Proxmox | Yes |
| VMware | Yes |
| Vultr | Yes |


사실 더 좋은게 기본적으로 제공되는데, 굳이 고생을 사서 할 필요는 없다.


### 특징

- 데몬셋으로 `speaker`라는 파드를 생성해 External IP를 전파한다.
- `speaker` 파드는 호스트 네트워크(`hostNetwork: true`, 네트워크 모드 유사: `NetworkMode: host`)를 사용한다.
- `LoadBalancer` 서비스의 External IP 전파를 위해 표준 프로토콜을 사용한다: `ARP(IPv4)`, `NDP(IPv6)`, `BGP`.
- 두 가지 동작 모드를 지원하며, 환경에 맞게 선택·구성한다.
  - **L2 mode (ARP/NDP)**: 같은 서브넷 내에서 ARP/NDP로 VIP를 광고한다.
  - **BGP mode**: 외부 네트워크 라우터와 BGP로 경로 정보를 동적으로 공유한다.

#### 사전지식

##### GARP(Gratuitous ARP)
- 일반적인 ARP 요청과 달리, 특정 IP를 질의하지 않고 자신의 IP를 네트워크에 광고하는 패킷.
- 목적
  - IP 주소 충돌 감지 및 방지
  - 장치의 IP가 변경되었을 때 스위치/라우터/호스트의 ARP 캐시 업데이트
  - 로드밸런서·VRRP·MetalLB에서 마스터 전환 시 새 IP–MAC 정보를 빠르게 알림

##### Strict ARP
- 자신에게 실제로 할당된 IP에 대해서만 ARP 요청에 응답하도록 하는 네트워크 설정.
- 왜 중요한가
  1. MetalLB의 L2 모드
     - LoadBalancer VIP에 대해 올바른 노드만 ARP 응답하도록 보장한다.
     - 비활성화 시 잘못된 노드가 VIP에 응답해 트래픽이 오경로로 전달될 수 있다.
  2. kube-proxy IPVS 모드
     - 노드가 소유하지 않은 IP에 응답하지 않게 하여, ARP 패킷이 잘못된 인터페이스로 흐르는 문제를 방지한다.

### 설치
설치는 다양한 방법이 있는데, 가장 대중적인 `helm`을 쓰도록 하겠다.

#### Helm Repo 추가
```bash
helm repo add metallb https://metallb.github.io/metallb
```

#### 리포지터리 업데이트
```bash
helm repo update
```

#### 네임스페이스 생성
```bash
kubectl create namespace metallb-system
```

#### Metallb 설치
```bash
helm upgrade --install metallb metallb/metallb -n metallb-system --wait
```

#### CRD 확인
```bash
kubectl get crd | grep metallb.io
```
다음과 같이 출력되면 정상이다.
```bash
bfdprofiles.metallb.io                                2025-08-03T16:07:22Z
bgpadvertisements.metallb.io                          2025-08-03T16:07:22Z
bgppeers.metallb.io                                   2025-08-03T16:07:22Z
communities.metallb.io                                2025-08-03T16:07:22Z
ipaddresspools.metallb.io                             2025-08-03T16:07:22Z
l2advertisements.metallb.io                           2025-08-03T16:07:22Z
servicebgpstatuses.metallb.io                         2025-08-03T16:07:22Z
servicel2statuses.metallb.io                          2025-08-03T16:07:22Z
```
여기서 `ipaddresspools.metallb.io`과 `l2advertisements.metallb.io` 리소스를 하나씩 Manifest로 만들어줘야 한다.

내가 할당하고자 하는 LB의 IP는 `93.5.22.100`이다. 

#### IPAddressPool 매니페스트 작성 및 적용

`ipaddresspool.yaml`:
```yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: workstation-ip-pool
  namespace: metallb-system
spec:
  addresses:
    - 93.5.22.100
```
적용:

```bash
kubectl apply -f ipaddresspool.yaml
```

Addresses는 범위로 지정할 수도 있다, 가령 `192.168.1.100-192.168.1.200`

#### L2Advertisement 매니페스트 작성 및 적용

`l2advertisement.yaml`:
```yaml
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: workstation-l2adv
  namespace: metallb-system
spec:
  ipAddressPools:
    - workstation-ip-pool
```

적용:

```bash
kubectl apply -f l2advertisement.yaml
```

#### 동작 확인

- 컨트롤러/스피커 파드:

```bash
kubectl get pods -n metallb-system -o wide
```

- 풀/광고 리소스:

```bash
kubectl get ipaddresspools.metallb.io,l2advertisements.metallb.io -n metallb-system
```

- 서비스 `LoadBalancer` 외부 IP 확인:

```bash
kubectl get svc -A | grep LoadBalancer || true
```


### 포트포워딩

<p align='center'>
    <img src="forward-http-to-lb.png" alt>
</p>
