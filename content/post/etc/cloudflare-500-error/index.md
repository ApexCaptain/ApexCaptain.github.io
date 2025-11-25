---
title: Cloudflare 500 Internal Server Error
description: 잠시 지구가 멈췄습니다
slug: etc/cloudflare-500-error
date: 2025-11-18 00:00:00+0900
image: images/cover.png
categories:
    - ETC
tags:
    - Cloudflare
weight: 1
---

멀티클러스터 메시 환경에 모니터링 스택을 얹으려고  
CDK for Terraform으로 Helm 차트를 Kubernetes에 배포하던 중이었다.

> 그러다 돌연 **500 Internal Server Error** 발생했다.

무슨 일인가 조사해봤는데, 아무래도 Cloudflare 자체에 문제가 생긴 모양이다.

<p align='left'>
    <img width=70% src="images/x.png" alt>
</p>

X<sub>(구 트위터)</sub>도 접속이 안 되고

<p align='left'>
    <img width=70% src="images/chatgpt.png" alt>
</p>

GPT 페이지도 에러를 뿜고

<p align='left'>
    <img width=70% src="images/blog.png" alt>
</p>

당연히 내 블로그도 에러가 난다. 😢

<p align='left'>
    <img src="images/fix.png" alt>
</p>

[Cloudflare Status 페이지](https://www.cloudflarestatus.com/)를 보니 지금 열심히 복구 작업 중인 모양이다.

<p align='left'>
    <img src="images/discord.png" alt>
</p>

디스코드 채널에도 들어가 봤는데 하나같이 불만을 성토하는 채팅이 잔뜩이다.  
서버가 죽었다고 시위하는 사람, 합법적으로 농땡이 부린다고 마냥 좋아하는 사람,  
무슨 일 있나 싶어 그냥 들렀다가 혼란에 휩쓸린 사람까지 그야말로 소돔과 고모라를 방불케 했다.

이건 뭐, 즉각적인 해결책이랄 것도 없다. 그냥 Cloudflare 팀을 믿고 기다리는 수밖에.  
추후 비슷한 일을 대비해 CDN을 이중화해야 할까 고민만 잔뜩 쌓여 간다. <sub>(근데 그게 가능은 한가?)</sub>