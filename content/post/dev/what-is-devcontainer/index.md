---
title: DevContainer 톺아보기
description: 개발 환경도 이제 Docker로 구축하자
slug: dev/what-is-devcontainer
date: 2025-10-18 00:00:00+0900
image: images/cover.png
categories:
    - Development
subcategories:
    - DevContainer
tags:
    - Dev Tools
    - Docker
    - Docker Compose
weight: 1
---
## 들어가기 앞서

회사의 서버 인프라를 관리하는 한 사람의 엔지니어로써  
개인적으로 **정말 듣기 싫어하는 소리**가 하나 있다.

<p align='left'>
    <img width=40% src="images/ralph wiggum.png" alt>
</p>

> 제 컴퓨터에선 잘 돌아가던데요?

개발자 PC에선 잘 동작하던 코드가 서버에 올리기만 하면 온갖 에러를 내면서 뻗어버리는 경우가 있는데,    
이는 근본적으로 저마다 서로 다른 개발 및 테스트 환경을 구축해 두었기 때문에 생기는 문제이다.

예를들어:
- 운영체제
- 개발도구(IDE 등)
- 환경 설정 <sub>(dev/prod/test/stage)</sub>

등등...

더 볼 것도 없이 애초에 작업은 `Windows`나 `Mac`에서 하면서 그걸 실행하는 서버가 `Linux`이니 **문제가 안 생길래야 안 생길 수가 없다.**

<p align='center'>
    <img src="images/ritual-in-server-room.png" alt>
    <em>오죽하면 서버실에서 제단 쌓고 기도까지 올릴 지경이다</em>
</p>


다행히 **Docker**와 **Container**를 도입한 이래로는 이러한 일의 발생 빈도가 확연히 줄어들었다.   
환경변수 설정을 잘못 잡아놨다거나, 이미지를 빌드할 때 CPU Architecture<sub>(ARM/AMD)</sub>를 고려하지 않았다 수준의 특이 케이스를 제외하면 말이다.  

작업한 소스코드를 **테스트 할 때**, 빌드한 소스가 **서버에서 실행 될 때** 모두 Container 위에서 동작하는 것이므로 일관성이 보장된다. 👍

<br>

## 문제의 시작
### 개발환경 구축의 어려움

> 그런데 정작 개발환경 그 자체는 어떠한가?

개발자의 로컬 PC에서 이미지를 빌드하고 컨테이너로 실행시켜 테스트 해보는 건 어렵지 않다.  
하지만 여전히 개발자의 작업 환경은 `Windows` 혹은 `Mac`이라는 OS에 종속되어 있다.  
이러한 OS에 Native하게 환경을 구축하는 것은 여전히 매우 번거로운 일이다.

Windows에 `Java Spring Boot` + `Oracle DB`를 쓰는 웹 애플리케이션 개발환경을 구축한다고 생각해보자.

우선 Java부터 설치해야 한다.

1. Oracle에 접속해 원하는 버전의 JDK를 다운

2. 1에서 다운받은 파일을 실행시켜 설치 진행

3. JDK의 설치 경로를 확인, 가령 `C:\Program Files\Java\jdk-x.y.z`

4. Windows 환경 변수에 `JAVA_HOME` 시스템 변수를 생성하고 3의 경로를 입력

5. 시스템 변수 `Path`에 4에서 입력한 환경변수를 추가, 가령 `%JAVA_HOME%\bin`

이 정도는 별 거 아니라고 생각할 수도 있다.

> 같은 스택의 새 프로젝트를 맡게 되었다.  
> 근데 사용하는 **Java 버전이 달라졌다**고 한다.  
> 어떻게 하지?


새로운 JDK를 설치해야할까? 아니면 `IntelliJ IDEA`같은 IDE로 넘어가야 하나?

> 연결하는 **데이터베이스 버전도 바뀐다면?**

`Oracle DB 19C`를 사용해서 프로젝트를 진행했었는데,  
새 프로젝트에선 `Oracle DB 21C`를 사용한다고 한다.

로컬 PC에 그럼 DB를 2개 설치해야 하는 걸까? 기존 DB를 지워야 하나?  
아니면 아예 DB 서버에 `개발용` Schema를 따로 만들어야 하나?

> 다 떠나서 아예 컴퓨터를 새로 사거나 포맷이라도 하면...?

<p align='left'>
    <img src="images/Kim-Jong-un.gif" alt>
</p>


...이건 정말 상상하기도 싫다.  
그나마 고유의 환경 구축 절차를 별도로 문서화 해두지 않았다면 감히 엄두도 못 낼 일이다.


여태 언급된 것들은 결코 허황되거나 과장된 예시가 아니다.  
<sub>(왜냐하면 내가 지금 다니고 있는 회사가 처음에 딱 저런 상황이었으니까...)</sub>

`Java Spring Boot`에 `Oracle DB`  
이는 대한민국에서 한 때 <sub>(어쩌면 지금도)</sub> 가장 보편적으로 쓰이던 애플리케이션 스택이다.  
이렇게 단순한 예시에서도 문제점이 훤히 보이는데, 실제 개발 환경은 저것보다 훨씬 더 복잡하고 다양한 의존성을 요구하기 마련이다.

<br>

## DevContainer 기본설정

[**Codespaces**](https://github.com/features/codespaces?locale=ko-KR), [**Gitpod**](https://ona.com/), [**DevPod**](https://devpod.sh/)등 여러가지 방법론이 제시되어 왔으나,  
대게 별도 플랫폼에 종속된 서비스의 형태(SaaS)로 제공되거나 <sub>(당연히 무료는 아니다)</sub>  
자체 호스팅을 하더라고 **Kubernetes 클러스터가 전제 조건**인 경우도 있다.  

처음부터 이렇게 밑밥을 깔아버리면 도전하고자 하는 마음이 꺾일 지도 모른다.  
고로 이번 포스트에선 개발자에게 가장 익숙하고 직관적인 방식으로 접근하고자 한다.

우선 앞서 기술한 문제의 요지를 정리하면 다음과 같다.

- 개발환경의 일관성 보장 **X**

- 각 프로젝트별로 격리된 환경 보장 **X**

- 인간의 실수가 발생할 여지가 많은 복잡한 구성 절차

> 그런데 이거... 어디서 많이 봐왔던 이슈 아닌가?

그렇다, 우리가 Docker를 사용하는 이유와 일맥상통한다.

`테스트 환경`과 `운영 환경`을 Container로 일관화 시켰듯,  
`개발환경`도 Container화 해보도록 하자.

이번에 알아볼 주제는 `DevContainer`이다.



<br>

### DevContainer란 무엇인가?

<p align='left'>
    <img src="images/i-will-explain.png" alt>
</p>


[DevContainer (Development Container)](https://containers.dev/)는 Microsoft에서 만든 오픈소스 프로젝트로,  
`vsCode` 혹은 `Cursor`와 같은 vsCode의 파생 IDE 에서 사용할 수 있는 개발 전용 라이브러리이다.  
개발에 필요한 `모든 도구`, `모든 설정`을 Container로 패키징하여 사용할 수 있게 해준다.

주요 특징은 다음과 같다.

1. **일관성**

    사용자가 PC를 포맷을 하든, 새로운 PC를 구매하든 관계없다.  
    심지어 어떤 OS를 사용해도 항상 동일한 환경을 보장한다.

2. **재현성**

    환경 구축 자체를 Docker를 사용해서 하므로,  
    복잡한 과정 없이 단 한 번의 클릭으로 모든 개발환경이 완벽하게 세팅된다.

3. **격리성**

    프로젝트별로 **고유한** 개발 환경을 구축할 수 있다.  

<br>

### 사전준비

- **Docker** 실행환경

    당연한 얘기지만 Docker에 접근 할 수 있어야 한다.  

    Windows 사용자라면 `WSL`과 `Docker Desktop`이 필요하고  
    Mac 사용자라면 `Docker Desktop`을 설치하도록 하자. 

    만일 `별도의 Linux 개발서버`를 사용한다면 해당 서버에 `Docker`와 `Docker Compose`를 설치하고 `SSH`로 접속 가능하도록 설정해주자.

    이 내용을 다 적었다간 지나치게 장황해지므로 추후 별도로 포스트 하도록 하겠다.

- [**vsCode**](https://code.visualstudio.com/) 혹은 [**Cursor**](https://cursor.com/agents) 설치

- IDE에 **Extension** 설치

    - `vsCode` 사용자라면 [Remote Development](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack)으로 한 번에 필요한 모든 Extension을 설치할 수 있다.
    - `Cursor` 사용자라면  

        우선 `Dev Container` Extension이 필요하다.
        <p align='left'>
            <img src="images/cursor-extension-devContainers.png" alt>
        </p>

        추가로 `WSL`을 사용하는 경우는 `WSL` Extension을
        <p align='left'>
            <img src="images/cursor-extension-wsl.png" alt>
        </p>

        `SSH`로 원격 개발 서버를 통해서 사용한다면 `Remote - SSH` Extension을 설치해야 한다.
        <p align='left'>
            <img src="images/cursor-extension-remote-ssh.png" alt>
        </p>

<br>

### 설정 파일 준비

#### DevContainer 디렉토리

DevContainer 설정 파일들을 저장하기 위해 프로젝트 루트에 `.devcontainer`라는 디렉토리를 만들어주자.

<p align='left'>
    <img width=30% src="images/settings/base-directory.png" alt>
</p>

devcontainer 구성을 위한 모든 파일은 전부 이 디렉토리 안에 저장된다.

<br>

#### `devcontainer.json`

DevContainer 빌드의 시작점이 되는 파일이다.  
이 파일의 전체적인 Spec이 궁금하다면 [다음의 링크](https://containers.dev/implementors/json_reference/)에서 확인 해보자. 

사용할 수 있는 옵션이 굉장히 많은데,  
우선은 최대한 간단하게 예시와 같이 작성해주자.


```json
// .devcontainer/devcontainer.json

{
  // General

  // Docker Desktop을 쓴다면 UI에 다음의 속성이 표시된다.
  "name": "My First DevContainer",

  // Container 내부에서 사용할 사용자명
  // 특별한 이유가 없다면 그냥 `vscode`로 두자
  "remoteUser": "vscode",


  // Docker Compose
  // Docker Image로 설정하는 방식도 있는데
  // 멀티 컨테이너로의 확장성을 고려하면 docker compose를 사용하는 걸 추천한다.
  
  // 대상 Docker Compose 파일
  "dockerComposeFile": "docker-compose.dev.yml",

  // compose 파일에서 DevContainer로 동작시킬 service의 이름이다
  "service": "workspace",

  // devcontainer로 동작시킬 대상 service에서 프로젝트가 위치할 경로이다.
  "workspaceFolder": "/home/vscode/workspace/my-project-name",
}
```

<br>

#### `docker-compose.dev.yml`

위에서 지정한 `dockerComposeFile`이다.  

```yml
# .devcontainer/docker-compose.dev.yml

services:
  # `devcontainer.json`에서 service를 "workspace"라고 
  # 지정했으므로 여기에도 같은 이름을 적어야한다.
  workspace:
    container_name: my-devcontainer-workspace
    # Base on Ubuntu Noble
    image: mcr.microsoft.com/devcontainers/base:dev-noble

    command: sleep infinity

    volumes:
      # Workspace Cache
      # `devcontainer.json`의 `workspaceFolder`와 동일한 값이어야 한다.
      - ..:/home/vscode/workspace/my-project-name:cached
```

여기까지 진행했다면 기본적인 준비는 끝이 났다. 🎉  
`F1` 키를 누르고 `Dev Containers: Rebuild Container`를 실행하자.

<p align='center'>
    <img src="images/settings/first-build.gif" alt>
</p>

간단히 컨테이너가 빌드 / 실행되고 내부로 IDE가 진입하는 모습이다.
<p align='left'>
    <img src="images/that-easy.png" alt>
</p>

> 자 이제 하나씩 **심화 과정**으로 들어가보자.


<br>

## 심화 과정

### Image는 뭘 고르지?

예시에서 사용한 Docker Image는 `mcr.microsoft.com/devcontainers/base:dev-noble`이다.

이 이미지에 대해 간단히 설명하면 다음과 같다.
- **mcr** <sub>(Microsoft Artifact Registry 혹은 Microsoft Container Registry)</sub>에 배포된

- **Microsoft**가 만든

- **DevContainer**용

- **base**(기반) 이미지의

- **dev-noble** 태그 (Ubuntu Noble 버전)

당연히 [다른 이미지](https://mcr.microsoft.com/en-us/catalog?search=devcontainer&type=partial)도 엄청나게 많다.

<p align='center'>
    <img src="images/settings/mcr-devcon-images.png" alt>
    <em>내가 고른 건 여기서 가장 오른쪽 아래 이미지이다</em>
</p>

`base image`는 말 그대로 기반이 되는 이미지로, 안에는 `Git`이나 `Bash` 같은 걸 제외하고는 *아무것도 설치되어 있지 않다.*

원하는 개발 환경에 맞춰 이미지를 고르면 된다.

예를들어:

- [**Typescript**를 써서 **Node.Js** 앱 만들어야지](https://mcr.microsoft.com/en-us/artifact/mar/devcontainers/typescript-node/tags)
- [**.NET 프레임워크** 기반으로 앱 만들고싶어](https://mcr.microsoft.com/en-us/artifact/mar/devcontainers/dotnet/tags)
- [모르겠고, 그냥 **모든 언어**가 다 설치되어 있으면 좋겠어](https://mcr.microsoft.com/en-us/artifact/mar/devcontainers/universal/tags)

하지만 나는 개인적으로는 `base` 이미지를 고수하는 걸 추천한다.

> 어? 그럼 개발도구 설치는 어떻게 하지?
>
> `Dockerfile`을 커스텀 해서 써야하나?

지극히 당연한 추론이다.  
하지만 **그보다 더 좋은 방법**이 있다.  
다음 섹션을 참고하자.

<br>

### Features로 개발도구 설치하기

DevContainer에는 `Features`라는 항목이 있다.  
`devcontainer.json`파일에 원하는 Feature(기능)를 선언하면,  
해당하는 기능들이 DevContainer에 설치된다.

사용 가능한 기능들은 [**DevContainer 페이지의 Available Features 탭**](https://containers.dev/features)에서 확인 가능하다.

<br>

#### 설치

말해 뭐 하겠는가, 직접 해보도록 하자.  
예시로 `Java`, `nodejs`, `python` 그리고 `Docker in Docker`를 DevContainer에 설치해보겠다.

`.devcontainer/devcontainer.json` 파일을 다음과 같이 수정하자.

```json
// .devcontainer/devcontainer.json

{
  // General
  "name": "My First DevContainer",
  "remoteUser": "vscode",

  // Docker Compose
  "dockerComposeFile": "docker-compose.dev.yml",
  "service": "workspace",
  "workspaceFolder": "/home/vscode/workspace/my-project-name",

  // ------ 위는 기존 설정 그대로이다 ------ //
  // Features
  "features": {

    // Java 설치
    // https://github.com/devcontainers/features/tree/main/src/java
    "ghcr.io/devcontainers/features/java:1": {},

    // Node.js 설치
    // https://github.com/devcontainers/features/tree/main/src/node
    "ghcr.io/devcontainers/features/node:1": {},

    // Python 설치
    // https://github.com/devcontainers/features/tree/main/src/python
    "ghcr.io/devcontainers/features/python:1": {},

    // Docker in Docker 설치
    // https://github.com/devcontainers/features/tree/main/src/docker-in-docker
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  }
  
}
```

<br>

이후 다시 `F1` 키를 누르고 `Dev Containers: Rebuild Container`를 실행하자.


> 저것들 다 설치하려면 제법 시간이 걸린다.
>
> **커피 한 잔 끓여 오도록 하자.**

<br>

#### 설치 확인

DevContainer가 Rebuild 되었다면 터미널을 열고 제대로 설치가 되었는지 확인해보자.

1. **Java**
    ```bash
    vscode ➜ ~/workspace/my-project-name $ java --version
    openjdk 25 2025-09-16 LTS
    OpenJDK Runtime Environment Microsoft-12398176 (build 25+36-LTS)
    OpenJDK 64-Bit Server VM Microsoft-12398176 (build 25+36-LTS, mixed mode, sharing)
    ```

2. **nodejs**
    ```bash
    vscode ➜ ~/workspace/my-project-name $ node --version
    v22.20.0
    ```

3. **python**
    ```bash
    vscode ➜ ~/workspace/my-project-name $ python --version
    Python 3.12.3
    ```

4. **Docker in Docker** <sub>(Host와 격리된 Docker 환경)</sub>
    ```bash
    vscode ➜ ~/workspace/my-project-name $ docker --version
    Docker version 28.5.1-1, build e180ab8ab82d22b7895a3e6e110cf6dd5c45f1d7
    ```

모든 개발 도구들이 성공적으로 잘 설치되었다.   
주석을 제외하면 추가한 내용은 **고작 4줄**밖에 되지 않는다.   

<p align='left'>
    <img src="images/amazing.gif" alt>
</p>

*어디서 뭘 받고, 하나 하나 다음(Next) 눌러주면서 설치 해주고, 환경변수 설정하고...*  
이런 고생은 이제 안녕이다.  
<sub>(덕분에 온보딩 기간에 신입 직원이 개발환경 구성한답시고 일주일 날로 먹는 혜택은 누리기 힘들어지겠지만)</sub>

DevContainer를 쓰면 `Features`를 통해 원하는 환경을 입맛에 맞춰 아주 간편하게 구성할 수 있다.  

당연히 이는 모두 `Container` 안에 설치되는 것이므로, Host PC 환경에 영향을 줄 일도, 다른 container에 영향을 줄 일도 없다.

<br>

#### 상세 설정

Feature에는 상세 옵션도 설정 가능하다.  
마침 Java를 예시로 들었으니 내친김에 JDK 버전을 한 번 변경해보자.  
`devcontainer.json`의 주석에도 적어둔 [Java Feature Repository 링크](https://github.com/devcontainers/features/tree/main/src/java)로 들어가면 보다 상세한 설정 정보가 나온다.

| Options Id | Description | Type | Default Value |
|-----|-----|-----|-----|
| version | Select or enter a Java version to install | string | latest |
| additionalVersions | Enter additional Java versions, separated by commas. | string | - |
| jdkDistro | Select or enter a JDK distribution | string | ms |
| installGradle | Install Gradle, a build automation tool for multi-language software development | boolean | false |
| gradleVersion | Select or enter a Gradle version | string | latest |
| installMaven | Install Maven, a management tool for Java | boolean | false |
| mavenVersion | Select or enter a Maven version | string | latest |
| installAnt | Install Ant, a software tool for automating software build processes | boolean | false |
| antVersion | Select or enter an Ant version | string | latest |
| installGroovy | Install Groovy, powerful, optionally typed and dynamic language with static-typing and static compilation capabilities | boolean | false |
| groovyVersion | Select or enter a Groovy version | string | latest |

이 표는 DevContainer Java Feature에서 사용 가능한 옵션들이다.  
특별히 명시를 안 해주면 `기본값(Default Value)`이 적용된다.  
Java 버전을 정하는 `version` 옵션의 기본값은 `latest`다.  
실제로 확인해보면 작성일 기준, `JDK 25`가 설치되어 있다.  
이를 `21`로 변경해보자.

```json
// .devcontainer/devcontainer.json
{
  // ------ 기존 설정 ------ //
  "features": {
    // Java Feature
    // https://github.com/devcontainers/features/tree/main/src/java
    "ghcr.io/devcontainers/features/java:1": {
      "version": "21" // Java 21 버전으로 변경
    }
  }
}
```
다시 `F1` 키를 누르고 `Dev Containers: Rebuild Container`를 실행하자.

Docker가 작업을 마치고 나면 터미널을 열고 Java 버전을 확인해보자.

```bash
vscode ➜ ~/workspace/my-project-name $ java --version
openjdk 21.0.8 2025-07-15 LTS
OpenJDK Runtime Environment Microsoft-11933203 (build 21.0.8+9-LTS)
OpenJDK 64-Bit Server VM Microsoft-11933203 (build 21.0.8+9-LTS, mixed mode, sharing)
```
`openjdk 21.0.8`이 출력되었다. 잘 적용된 모습이다.

<br>

### Customizations 설정

DevContainer에는 `Customizations`라는 항목도 있다.

이는 해당 DevContainer만을 위한 IDE(vsCode) 커스텀 설정을 구성한다.

- **settings**  
    vsCode의 `settings.json`의 기본값을 설정해준다.

- **extensions**  
    지정한 `Extension`을 container에 설치한다.

<br>

#### Settings

vsCode 설정을 프로젝트별로 다르게 하고 싶을 때는 보통  
루트 경로의 `.vscode/settings.json` 파일을 만들어 사용하는 것이 일반적이다. <sub>(개인적으로 이 방식을 추천한다)</sub>   
`devcontainer.json`에 지정하는 `custom settings`는 이와 유사하게 동작한다.

IDE 화면이 맨날 새까만 화면이라 지루하지 않았는가?  
간단한 예시로 IDE의 테마를 한 번 변경해보자.  

가장 하단의 `customizations`을 보면 된다.

```json
// .devcontainer/devcontainer.json

{
  // General
  "name": "My First DevContainer",
  "remoteUser": "vscode",

  // Docker Compose
  "dockerComposeFile": "docker-compose.dev.yml",
  "service": "workspace",
  "workspaceFolder": "/home/vscode/workspace/my-project-name",

  // Features
  "features": {

    // Java Feature
    // https://github.com/devcontainers/features/tree/main/src/java
    "ghcr.io/devcontainers/features/java:1": {
      "version": "21" // Java 21 버전으로 변경
    },

    // Node.js Feature
    // https://github.com/devcontainers/features/tree/main/src/node
    "ghcr.io/devcontainers/features/node:1": {},

    // Python Feature
    // https://github.com/devcontainers/features/tree/main/src/python
    "ghcr.io/devcontainers/features/python:1": {},

    // Docker in Docker Feature
    // https://github.com/devcontainers/features/tree/main/src/docker-in-docker
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },
  
  // Custom
  "customizations": {
    "vscode": {
      // ------ 위는 기존 설정 그대로이다 ------ //
      // Settings
      "settings": {
        "workbench.colorTheme": "Red"
      },
    }
  }
}
```

`F1` 키를 누르고 `Dev Containers: Rebuild Container`를 실행한다.

<p align='center'>
    <img src="images/settings/blood-red-cursor-ide.png" alt>
    <em>당신의 눈 건강을 위해 준비한 <span style="color:red">붉은색</span> 테마이다</em>
    <br>
    <sub><i>내 눈은 아직 건강하므로 바로 원상복귀 해주었다.</i></sub>
</p>

<br>

#### Extensions

아무런 HTML 파일이나 하나 만들어보자.  
내 경우 Cursor에게 자기 자신에 대해 소개하는 HTML을 생성하라고 해보았다.

<p align='center'>
    <img src="images/settings/test-html.png" alt>
</p>


> 갑자기 이게 무슨 뚱딴지같은 소린가 싶겠지만 일단 계속 들어보길 바란다.

DevContainer에서 html 파일을 열어보면 다음과 같이 나올 것이다.

<p align='center'>
    <img src="images/settings/open-html-without-extension.png" alt>
</p>

평범한 Editor 화면이 나온다.  
`html 미리보기`가 가능하다면 좋겠는데 어떻게 할까?  
`Extension Marketplace`에서 `List Preview`라고 검색해서 Extension을 설치해주면 된다.

<p align='center'>
    <img src="images/settings/list-preview-extension.png" alt>
</p>

위 이미지 우측 하단에 있는 `마켓플레이스` 블록의 `식별자`를 살펴보자.  

`ms-vscode.live-server`라고 적혀있는 걸 볼 수 있다.  

이는 이 Extension의 고유 ID이다. 이제 이 값을 `devcontainer.json`에 기입해 자동으로 설치되게 해보자.  
가장 하단에 있는 `customizations` 블록을 보면 된다.
```json
// .devcontainer/devcontainer.json

{
  // General
  "name": "My First DevContainer",
  "remoteUser": "vscode",

  // Docker Compose
  "dockerComposeFile": "docker-compose.dev.yml",
  "service": "workspace",
  "workspaceFolder": "/home/vscode/workspace/my-project-name",

  // Features
  "features": {
    "ghcr.io/devcontainers/features/java:1": {
      "version": "21"
    },
    "ghcr.io/devcontainers/features/node:1": {},
    "ghcr.io/devcontainers/features/python:1": {},
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },
  
  // ------ 위는 기존 설정 그대로이다 ------ //
  // Customizations
  "customizations": {
    "vscode": {
      // Extensions
      "extensions": [
        // HTML Viewer Extension
        "ms-vscode.live-server"
      ]
    }
  }
}
```

한 번 더 `F1` 키를 누르고 `Dev Containers: Rebuild Container`를 실행한다.

이후 HTML 파일을 다시 열어보면 오른쪽 상단에 미리보기 버튼이 활성화된 것을 볼 수 있다.

<p align='center'>
    <img src="images/settings/open-html-with-extension-1.png" alt>
</p>

이 버튼을 누르면 HTML 미리보기가 가능하다.

<p align='center'>
    <img src="images/settings/open-html-with-extension-2.png" alt>
</p>

<br>

### Lifecycle Scripts

DevContainer는 일정한 [생명주기(lifecycle)](https://containers.dev/implementors/json_reference/#lifecycle-scripts)를 가지고 있다.  
그리고 각 생명주기에서 실행될 별도의 Script를 지정해줄 수 있는데 이를 `Lifecycle Scripts`라고 한다.

순서는 다음과 같다.

1. **initializeCommand**  
    DevContainer가 `생성되기 전`에  
    `호스트`에서 실행 *(이 이후 커맨드는 전부 Container 내부에서 실행된다.)*

2. **onCreateCommand**  
    DevContainer가 `생성된 직후` 실행  

3. **updateContentCommand**  
    DevContainer의 `내용이 업데이트될 때` 실행

4. **postCreateCommand**  
    DevContainer `생성 완료 후` 실행

5. **postStartCommand**  
    DevContainer가 `시작(start)될 때마다` 실행

6. **postAttachCommand**  
    VS Code나 Cursor등 `IDE가 DevContainer에 연결될 때` 실행

7. **waitFor**  
    특정 조건이 만족될 때까지 대기  
    예: 데이터베이스가 준비될 때까지, 특정 포트가 열릴 때까지 대기

**대부분의 도구**는 `Features`로 설치가 가능하지만,  
*마이너한* 혹은 *회사에서만 사용하는* **독특한 프로그램**이 있다면, Lifecycle Scripts를 사용해 구현이 가능하다.

이번엔 Lifecycle Scripts 중 하나인 `updateContentCommand`를 이용해서 DevContainer에 `redis-cli`라는 프로그램을 설치해보자.

우선 `.devcontainer` 밑에 `lifecycle`이라는 디렉토리를 만들어주자.  
이후 `updateContentCommand.sh` 파일을 다음과 같이 작성해준다.

```sh
#!/usr/bin/env bash
# .devcontainer/lifecycle/updateContentCommand.sh

echo "🔄 Updating apt package manager"
sudo apt update -y
sudo apt upgrade -y

echo "🔄 Installing apt packages"
sudo apt install -y \
    redis-tools

```

`devcontainer.json` 파일에 LifeCycle Scripts를 추가한다.  
가장 하단을 보면 된다.
```json
// .devcontainer/devcontainer.json

{
  // General
  "name": "My First DevContainer",
  "remoteUser": "vscode",

  // Docker Compose
  "dockerComposeFile": "docker-compose.dev.yml",
  "service": "workspace",
  "workspaceFolder": "/home/vscode/workspace/my-project-name",

  // Features
  "features": {

    // Java Feature
    // https://github.com/devcontainers/features/tree/main/src/java
    "ghcr.io/devcontainers/features/java:1": {
      "version": "21" // Java 21 버전으로 변경
    },

    // Node.js Feature
    // https://github.com/devcontainers/features/tree/main/src/node
    "ghcr.io/devcontainers/features/node:1": {},

    // Python Feature
    // https://github.com/devcontainers/features/tree/main/src/python
    "ghcr.io/devcontainers/features/python:1": {},

    // Docker in Docker Feature
    // https://github.com/devcontainers/features/tree/main/src/docker-in-docker
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },
  
  // Custom
  "customizations": {
    "vscode": {
      // Extensions
      "extensions": [
        // HTML Viewer Extension
        "ms-vscode.live-server"
      ]
    }
  },

  // ------ 위는 기존 설정 그대로이다 ------ //
  // LifeCycle Scripts
  "updateContentCommand": "bash ./.devcontainer/lifecycle/updateContentCommand.sh",
}
```

`F1` 키를 누르고 `Dev Containers: Rebuild Container`를 실행한다.

컨테이너가 Rebuild 되고 나면 터미널을 열어 제대로 설치가 되어있는지 확인해보자.
```bash
vscode ➜ ~/workspace/my-project-name $ redis-cli --version
redis-cli 7.0.15
```

<br>

### 멀티 컨테이너 구성하기

작업하는 프로젝트에 `외부 의존성`이 존재한다고 해보자.  

예를들어: 
- [ElasticSearch](https://www.elastic.co/kr/elasticsearch)
- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/)

등등...

이것들은 단순히 "**개발에 필요한 도구**"라기 보단 "**개발 환경**" 내지는 "**개발 인프라**"에 더 가깝다.  
DevContainer에 직접 설치 할 수도 있지만 그다지 추천하는 방법은 아니다.  

지금까지의 예시에서 사용한 DevContainer는 `docker-compose.dev.yml` 파일을 사용하고 있다.  
당연히 일반적인 `docker compose`처럼 다른 `service(container)`를 등록하는 것도 가능하다.

외부 의존성은 이 `docker compose` 파일에 정의 해줌으로써 간편하게 설정 할 수 있다.  
예시로 Redis Container를 `docker-compose.dev.yml`에 추가해보자.

```yml
# .devcontainer/docker-compose.dev.yml

services:
  workspace:
    container_name: my-devcontainer-workspace
    image: mcr.microsoft.com/devcontainers/base:dev-noble

    command: sleep infinity

    volumes:
      # Workspace Cache
      - ..:/home/vscode/workspace/my-project-name:cached

  # ----- 위는 기존 설정 그대로이다 ----- #
  redis:
    container_name: my-devcontainer-redis
    image: redis:alpine
    volumes:
      - my-project-name-redis:/data
    command: redis-server --save 20 1 --loglevel warning --requirepass my-redis-password

volumes:
  my-project-name-redis:
```

`F1` 키를 누르고 `Dev Containers: Rebuild Container`를 실행한다.

Rebuild가 되면 터미널을 열고 `redis-cli` 명령어로 새롭게 추가된 Redis 컨테이너에 접속해보자.  
바로 위 `Lifecycle Scripts` 섹션에 설치 방법을 적어두었다.

명령어는 다음과 같이 구성되어 있다.

> redis-cli -u redis://`<사용자명>`:`<비밀번호>`@`<접속 주소>`:`<포트>`

위 `docker-compose.dev.yml`에서는 별도 사용자명은 지정하지 않았고   
비밀번호는 `my-redis-password`로 해두었다.  
포트는 기본값을 그대로 쓰므로 굳이 지정하지 않아도 된다.  
URL은 docker compose의 service명을 그대로 쓴다.

따라서 다음과 같이 입력한다.

> redis-cli -u redis://default:my-redis-password@redis

```bash
vscode ➜ ~/workspace/my-project-name $ redis-cli -u redis://default:my-redis-password@redis
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
redis:6379>
```

이와 같은 터미널 결과를 봤다면 정상적으로 연결이 된 것이다.  

<br>

## 마치며

이번 포스트에서는 DevContainer를 통해 개발환경의 일관성과 격리성을 확보하는 방법에 대해 알아보았다.

처음에 언급했던 "제 컴퓨터에선 잘 돌아가던데요?"라는 말을 들을 일이 이제는 훨씬 줄어들 것이다.  
DevContainer를 사용하면:

- **개발환경의 일관성**이 보장되고
- **프로젝트별 격리된 환경**을 구축할 수 있으며  
- **복잡한 수동 설정 과정**을 자동화할 수 있다

특히 `Features`를 통한 개발도구 설치, `Customizations`을 통한 IDE 설정, `Lifecycle Scripts`를 통한 커스텀 스크립트 실행 등은 정말 강력한 기능들이다.

물론 처음 설정할 때는 조금 번거로울 수 있다.  
하지만 한 번 구축해두면 팀원 누구나 동일한 환경에서 개발을 시작할 수 있고,  
새로운 PC를 구매하거나 포맷을 해도 개발환경 구축에 대한 걱정은 이제 그만이다.

더 나아가 `멀티 컨테이너 구성`을 통해 데이터베이스나 캐시 서버 같은 외부 의존성까지도 함께 관리할 수 있다는 점은 정말 매력적이다.

**참고 자료**
- [DevContainer 공식 문서](https://containers.dev/)
- [Available Features](https://containers.dev/features)
- [devcontainer.json 스펙](https://containers.dev/implementors/json_reference/)
