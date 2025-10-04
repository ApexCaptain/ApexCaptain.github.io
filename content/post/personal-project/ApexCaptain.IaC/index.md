---
title: ApexCaptain.IaC
description: Terraform으로 멀티 클러스터 구성하기
slug: personal-project/apexcaptain.iac
date: 2025-09-28 18:05:00+0900
image: cover.png
categories:
    - 개인플젝
tags:
    - Terraform
    - Kubernetes
    - IaC
weight: 1    
---

# [GitHub](https://github.com/ApexCaptain/ApexCaptain.IaC)

## 주요 목표

- **하이브리드 멀티 클러스터**: OCI OKE(클라우드) + Workstation microk8s(온프레미스)
- **GitOps 파이프라인**: ArgoCD 중심의 선언적 배포 자동화
- **보안·신뢰**: Bastion, OAuth2 Proxy, Cert-Manager, Vault 중심 시크릿·인증 체계
- **관찰성**: Prometheus + Grafana 모니터링 스택
- **개인 미디어 인프라**: Jellyfin, qBittorrent, 게임 서버 등


## 아키텍처 개요

- **네트워크(OCI)**: VCN + Public/Private/DB Subnet, LB/Bastion, K8s 노드, 데이터 계층
- **클러스터 계층**
  - OKE(클라우드): System(NS)에 Istio, ArgoCD(개발 중), Vault(개발 중), 모니터링(개발 중), Ingress
  - Workstation(microk8s): System(NS)에 Istio/모니터링/Longhorn, Application(NS)에 Dev/Media/Game/File 서비스

## 현재 성과(핵심)

- **인프라 자동화**
  - OKE 및 Workstation 클러스터 구성 정의, 선택적 스택 배포/병렬화, 상태 백업 스크립트 제공
- **보안/신뢰**
  - Bastion 접근 제어, OAuth2 Proxy, Cert-Manager 자동 인증서 발급 구성
  - Vault 기반 시크릿 관리 체계 설계(개발 중)
- **운영 효율**
  - Prometheus/Grafana 관찰성 스택 구성(개발 중), 로그 중앙화 계획
  - 개인 미디어/유틸 서비스(Jellyfin, qBittorrent, SFTP, 7 Days to Die) 구성
- **개발 생산성**
  - `src/terraform/stacks` 중심 스택화 구조, `scripts/` 내 배포 선택/백업/터미널 도구
  - Projen, ESLint/Prettier, Yarn 워크플로우 정착

## 진행 현황(요약)

- OKE 클러스터 자동 프로비저닝: 구성
- Workstation microk8s 클러스터: 구성
- Istio 서비스 메시: 구성
- ArgoCD(GitOps): 개발 중
- Vault(시크릿): 개발 중
- Prometheus/Grafana(모니터링): 개발 중
- Bastion/인증·인증서(Cert-Manager, OAuth2 Proxy): 구성
- 미디어/게임/SFTP 서비스: 구성
