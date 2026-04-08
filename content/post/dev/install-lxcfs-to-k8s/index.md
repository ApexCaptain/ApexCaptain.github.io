---
title: LXCFS로 우리 Pod쪽이를 똑똑하게 키우는 법
slug: dev/install-lxcfs-to-k8s
date: 2025-12-02 00:00:00+0900
image: images/cover.png
categories:
    - Development
subcategories:
    - Kubernetes
tags:
    - Kubernetes
weight: 1
---

## 문제의 시작

### Pod 리소스 제한

클러스터에 Pod를 배포할 때는 CPU와 메모리 사용량에 제한을 두는 경우가 일반적이다.


이는 어찌 보면 당연한 것인데,  
이런 제한을 두지 않는다면 Pod는 자신이 동작하는 **호스트의 기둥 뿌리를 모조리 뽑아 써먹으려고** 할 것이고  
나아가, 다른 Pod가 해당 노드에 스케줄링되는 데 지대한 악영향을 끼칠 것이기 때문이다.

적용법은 대단히 쉽다.  
다음 예시와 같이 Pod의 `spec`에 명시해 주면 된다.

```yaml
resources:
    requests:  
        cpu: 100m
        memory: 128Mi
    limits:
        cpu: 200m
        memory: 256Mi

```

<br>
<p align='center'>
    <img src="images/bigdata-meme.png" alt>
</p>

<br><br>

### OOMKilled<sub>(Out of Memory)</sub>

<sub>~~20대 Pod쪽이들 사망 원인 1위~~</sub>

문제는 Pod라는 녀석이 생각 외로 멍청하다는 데 있다.

OOMKilled라고 하면 호스트 전체 메모리 부족 이후 커널 OOM killer가 개입하는 경우도 있겠으나,  
대개 Kubernetes Pod에서는 **manifest에 적어 둔 메모리 `limits`(cgroup 한도)를 넘겼을 때** 해당 컨테이너 프로세스가 강제 종료되고 자원이 회수되는 흐름을 말한다고 보면 된다.

난처한 점은, 메모리 한도 초과로 발생한 OOMKilled는 일반적인 Pod 종료와 달리 커널 OOM killer가 프로세스를 즉시 `SIGKILL`로 종료시키는 경우가 많아 `terminationGracePeriodSeconds`, `preStop`, `SIGTERM` 기반의 graceful shutdown 로직이 동작하지 않을 수 있다는 것이다. 

따라서 OOM 대응의 핵심은 종료 절차 설계보다는 메모리 사용량 자체를 한도 안으로 유지하는 데 있다.  
예를 들어 `requests/limits` 재조정, 메모리 누수 제거, 런타임별 메모리 옵션 튜닝, 오토스케일링 정책 보완 같은 접근이 더 직접적이다.

<br><br>

### Pod가 인식하는 리소스 한계치

> 그런데 생각해보면 좀 이상하다.

당신이 메모리 8GB짜리 저렴이 노트북 하나를 구매했다고 가정해보자.  
8GB 메모리 사용량을 약간 초과할 만한 작업을 명령할 경우 노트북은 어떻게 반응할까? 

Pod들이 그러하듯, 메모리 사용량 초과로 인해 OS가 통째로 먹통이 될까?

구형 PC라면 진짜 <span style="color:lightblue">블루 스크린</span>이 뜰 수도 있겠으나😱, 대개의 경우 OS가 페이지 회수나 스왑 같은 메커니즘으로 버티면서 성능이 먼저 저하되고 시스템이 즉시 셧다운되는 경우는 드물다.

요컨대 야근 10분 더 시킨다고 피곤해 하고 툴툴 댈 수는 있어도 그 자리에서 사표 내고 도망치지는 않는단 소리다.

> 그럼 Pod들은 왜 틈만 나면 지정된 리소스 제한을 넘으려고 하는 것인가?

결론부터 말하자면, Pod들이 기본적으로 spec에 적힌 리소스 제한과 무관하게  
자신이 올라간 **노드(호스트)의 리소스를 자신의 리소스로 착각**하고 있기 때문에 발생하는 현상이다.

더도 말고 덜도 말고 다음 예시처럼 Pod를 하나 배포해서 확인해보자.

```bash
kubectl create namespace test
```

우선 `test`라는 네임스페이스를 하나 만든다.


```yaml
# test.pod.yml
apiVersion: v1
kind: Pod
metadata:
  name: test
  namespace: test
spec:
  containers:
    - command:
        - sleep
        - infinity
      image: ubuntu
      name: test
      resources:
        limits:
          cpu: 200m
          memory: 256Mi
        requests:
          cpu: 100m
          memory: 128Mi

```

CPU 200m, 메모리 256Mi로 제한된 Ubuntu Pod이다.


```bash
kubectl apply -f test.pod.yml
```

배포가 되었다면 다음 명령어로 Pod 컨테이너 안에서 `free`가 보여주는 메모리(`/proc/meminfo` 등을 읽은 값)를 확인해보자.

```bash
kubectl exec test -n test -- free -h

               total        used        free      shared  buff/cache   available
Mem:            31Gi        17Gi       346Mi       179Mi        14Gi        14Gi
Swap:             0B          0B          0B
```

이상하게도 `limits.memory`는 256Mi로 두었는데, 컨테이너 안에서 `free`로 보면 **total이 31Gi**로 나온다.  
31Gi<sub>(32GB)</sub>는 이 Pod가 스케줄된 노드의 물리 메모리 규모와 맞아떨어지는 값으로, 애플리케이션이 읽는 `/proc` 쪽 정보가 **cgroup 한도가 아니라 노드 전체 스케일**로 노출되어 있다는 뜻이다.


<br><br>

## 해결방안

### [LXCFS (Linux Container File System)](https://linuxcontainers.org/lxcfs/introduction/)

LXCFS는 리눅스 커널의 한계를 우회하기 위해 만들어진 간단한 유저스페이스 파일시스템이다.  
핵심 아이디어는 컨테이너 내부에서 읽는 `/proc` 정보를 **cgroup 인식 값**으로 바꿔서 보여주는 데 있다.

LXCFS가 제공하는 핵심 기능은 크게 두 가지다.

1. `/proc`의 일부 파일 위에 bind-mount로 덮어쓸 수 있는 파일 세트 제공  
   - 컨테이너 안에서 `free`, `top` 같은 도구가 읽는 값이 호스트 전체 기준이 아니라, 컨테이너 관점(cgroup 기준)에 가깝게 보이도록 만든다.
2. 컨테이너 인지형 cgroupfs 유사 트리 제공  
   - 컨테이너 내부 프로세스가 cgroup 관련 정보를 다룰 때 더 일관된 뷰를 얻을 수 있다.

즉, LXCFS는 "리소스 제한은 걸려 있는데 앱이 보는 시스템 정보는 호스트 전체처럼 보이는" 간극을 줄여서,  
컨테이너를 더 독립된 시스템처럼 느끼게 해주는 보정 레이어라고 보면 된다.

> 참고: cgroup namespace 도입 이후 일부 초기 목적은 줄어들었고, 현재는 `/proc` 마스킹을 통해 컨테이너의 체감 독립성을 높이는 쪽에 더 초점이 맞춰져 있다.

<br><br>

### Helm을 통해 배포

[lxcfs-on-kubernetes 프로젝트](https://github.com/cndoit18/lxcfs-on-kubernetes)를 사용하면 LXCFS를 클러스터에 비교적 간단하게 배포할 수 있다.  
기본 흐름은 `Helm chart 설치 -> 네임스페이스 라벨링 -> 워크로드 재기동 후 확인` 순서다.

<br>

#### 사전 준비

[차트 Repo](https://github.com/cndoit18/lxcfs-on-kubernetes)에 적힌 사전 요구사항은 다음과 같다<sub>(사용하는 차트 버전에 따라 달라질 수 있으니 설치 전 릴리스 문서를 함께 확인하자)</sub>.

- Kubernetes v1.19+
- Helm v3
- cert-manager v1.2+

<br>

#### Helm 리포지토리 등록

```bash
helm repo add lxcfs-on-kubernetes https://cndoit18.github.io/lxcfs-on-kubernetes/
helm repo update
```

<br>

#### LXCFS 설치

```bash
helm upgrade --install lxcfs lxcfs-on-kubernetes/lxcfs-on-kubernetes -n lxcfs --create-namespace
```

혹은 사전에 네임스페이스를 생성해도 좋고, 그냥 `kube-system` 네임스페이스에 설치해도 무방하다.


<br>

#### LXCFS 주입 대상 네임스페이스 라벨링

아래 예시는 `test` 네임스페이스에 라벨로 LXCFS 마운트 주입을 활성화하는 방법이다.

```bash
kubectl label namespace test mount-lxcfs=enabled
```

이미 실행 중인 Pod에는 즉시 반영되지 않을 수 있으므로, 대상 워크로드를 재시작해서 새 Pod가 뜨도록 맞춰 주는 편이 안전하다.

<br>

#### 적용 확인

라벨링한 네임스페이스에 테스트 Pod를 띄운 뒤, 이전과 동일하게 `free -h` 또는 `/proc/meminfo`를 확인한다.
LXCFS가 정상 동작하면 애플리케이션이 보는 리소스 정보가 컨테이너(cgroup) 관점으로 더 가깝게 보정된다.

> 참고: 차트/버전별로 마운트 경로나 검증 로직이 달라질 수 있으니, 실제 운영 적용 전에는 사용하는 릴리즈 문서의 Breaking Changes를 꼭 확인하자.

```bash
kubectl exec test -n test -- free -h

               total        used        free      shared  buff/cache   available
Mem:           256Mi       1.1Mi       254Mi          0B       129Ki       254Mi
Swap:             0B          0B          0B
```

재배포 후 다시 확인해보면 메모리가 의도한 대로 출력되는 것을 확인할 수 있다.


<br><br>

## Troubleshooting

### Pod에 Volume 개별 마운트 방식

가장 쉬운 적용 방법은 위에서 언급한 것처럼 대상 네임스페이스에 `mount-lxcfs=enabled` 라벨을 다는 것이지만, 
보다 선택적/제한적으로 적용하고자 할 경우에는 개별 파일을 Volume으로 마운트해 구현할 수 있다.

우선 `test` 네임스페이스의 해당 라벨을 제거해 준다.

```bash
kubectl label namespace test mount-lxcfs-
```


`lxcfs-on-kubernetes` Helm Chart는 클러스터 내 모든 노드에 대해 DaemonSet으로 LXCFS를 설치한다.  
기본 설치 경로는 `/var/lib/lxcfs-on-k8s/lxcfs`이다. Values를 조절해서 경로를 바꿀 수 있으나,  
기본값으로 두었다고 가정하고 Pod Spec을 다음과 같이 수정해주자.



```yaml
# test.pod.yml
apiVersion: v1
kind: Pod
metadata:
  name: test
spec:
  containers:
    - command:
        - sleep
        - infinity
      image: ubuntu
      name: test
      resources:
        limits:
          cpu: 200m
          memory: 256Mi
        requests:
          cpu: 100m
          memory: 128Mi
      volumeMounts:
        - mountPath: /proc/meminfo
          mountPropagation: None
          name: lxcfs-meminfo
          readOnly: true
        - mountPath: /proc/cpuinfo
          mountPropagation: None
          name: lxcfs-cpuinfo
          readOnly: true
        - mountPath: /proc/stat
          mountPropagation: None
          name: lxcfs-stat
          readOnly: true
        - mountPath: /proc/loadavg
          mountPropagation: None
          name: lxcfs-loadavg
          readOnly: true
        - mountPath: /proc/uptime
          mountPropagation: None
          name: lxcfs-uptime
          readOnly: true
  volumes:
    - hostPath:
        path: /var/lib/lxcfs-on-k8s/lxcfs/proc/meminfo
        type: File
      name: lxcfs-meminfo
    - hostPath:
        path: /var/lib/lxcfs-on-k8s/lxcfs/proc/cpuinfo
        type: File
      name: lxcfs-cpuinfo
    - hostPath:
        path: /var/lib/lxcfs-on-k8s/lxcfs/proc/stat
        type: File
      name: lxcfs-stat
    - hostPath:
        path: /var/lib/lxcfs-on-k8s/lxcfs/proc/loadavg
        type: File
      name: lxcfs-loadavg
    - hostPath:
        path: /var/lib/lxcfs-on-k8s/lxcfs/proc/uptime
        type: File
      name: lxcfs-uptime
```

수정된 `test.pod.yml` 파일을 배포한다.

```bash
kubectl apply -f test.pod.yml
```

이제 다시 test Pod의 메모리 할당 정보를 확인해보자.

```bash
kubectl exec test -n test -- free -h

               total        used        free      shared  buff/cache   available
Mem:           256Mi       1.1Mi       254Mi          0B       129Ki       254Mi
Swap:             0B          0B          0B
```

<br><br>

### 노드(호스트) FUSE 마운트 손상 시 해결

노드(호스트)에서 LXCFS는 FUSE로 마운트되어 있다.  
경로는 앞서 언급한 바와 같이 `/var/lib/lxcfs-on-k8s/lxcfs`

간혹 해당 경로의 FUSE 마운트가 깨지는 경우가 있는데, 노드를 강제로 리부트할 때 종종 발생한다.  
마운트 손상 시 `lxcfs-on-kubernetes` Helm Chart는 이를 자동으로 복구하는 기능이 없어 별도의 DaemonSet을 추가했다.

```yaml
# lxcfs-mount-recovery.daemonset.yml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  labels:
    app.kubernetes.io/name: lxcfs-mount-recovery
  name: lxcfs-mount-recovery-daemon-set
  namespace: lxcfs
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: lxcfs-mount-recovery
  template:
    metadata:
      labels:
        app.kubernetes.io/name: lxcfs-mount-recovery
    spec:
      automountServiceAccountToken: true
      containers:
        # 60초(ENV에 명시)마다 1번씩 노드(호스트)의 LXCFS FUSE 마운트 상태를 확인한 후
        # 비정상일 경우 마운트를 해제한다.
        # 마운트가 해제되면 LXCFS Helm Chart가 자동으로 다시 마운트를 진행한다.
        - args:
            - |-
              while true; do
                OUT=$(nsenter -t 1 -m -- stat "$MOUNT_PATH" 2>&1 || true)
                if echo "$OUT" | grep -qiE 'transport endpoint|not connected|stale'; then
                  echo "$(date +%Y-%m-%dT%H:%M:%SZ) broken lxcfs mount at $MOUNT_PATH, lazy unmount" >&2
                  nsenter -t 1 -m -- umount -l "$MOUNT_PATH" 2>/dev/null || true
                fi
                sleep "$INTERVAL"
              done
          command:
            - /bin/sh
            - -c
          env:
            # 확인 주기
            - name: INTERVAL
              value: '60'
            
            # LXCFS 호스트 마운트 경로
            - name: MOUNT_PATH
              value: /var/lib/lxcfs-on-k8s/lxcfs
          image: alpine
          name: mount-recovery
          resources:
            limits:
              cpu: 100m
              memory: 64Mi
            requests:
              cpu: 10m
              memory: 32Mi
          securityContext:
            privileged: true
      hostPID: true
      priorityClassName: system-node-critical
      tolerations:
        - effect: NoExecute
          operator: Exists
        - effect: NoSchedule
          operator: Exists
  updateStrategy:
    type: RollingUpdate


```

작성한 매니페스트를 적용해 데몬셋을 배포한다.

```bash
kubectl apply -f lxcfs-mount-recovery.daemonset.yml
```

배포 후에는 다음 명령으로 각 노드에 Pod가 정상적으로 뜨는지 확인한다.

```bash
kubectl get pods -n lxcfs -l app.kubernetes.io/name=lxcfs-mount-recovery -o wide
```