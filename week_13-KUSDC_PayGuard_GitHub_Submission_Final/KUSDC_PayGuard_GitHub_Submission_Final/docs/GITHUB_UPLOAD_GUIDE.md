# GitHub 업로드 방법

## 1. 업로드 전 확인

GitHub에 올리기 전에 반드시 확인하세요.

- `.env` 파일은 올리지 않기
- `.env.example`은 올리기
- `presentation/` 폴더 안에 PPT가 있는지 확인
- `README.md`가 루트 폴더에 있는지 확인
- `public/`, `server.js`, `package.json`이 있는지 확인

## 2. GitHub 웹사이트에서 직접 업로드하는 방법

1. GitHub 로그인
2. 오른쪽 위 `+` 클릭
3. `New repository` 클릭
4. Repository name 예시:

```text
KUSDC-PayGuard
```

5. Public 또는 Private 선택
6. `Create repository` 클릭
7. `uploading an existing file` 클릭
8. 이 폴더 안의 파일들을 드래그해서 업로드
9. Commit message 작성:

```text
Initial commit: KUSDC PayGuard project
```

10. `Commit changes` 클릭

## 3. 터미널로 업로드하는 방법

GitHub에서 빈 repository를 만든 뒤, 이 폴더에서 아래 명령어를 실행합니다.

```bash
git init
git add .
git commit -m "Initial commit: KUSDC PayGuard project"
git branch -M main
git remote add origin https://github.com/본인아이디/KUSDC-PayGuard.git
git push -u origin main
```

## 4. 업로드 후 확인할 것

GitHub repository에서 아래 파일이 보여야 합니다.

```text
README.md
server.js
package.json
public/index.html
public/app.js
public/styles.css
.env.example
presentation/20235143_유혜민_프로젝트제안_AI-Assisted_KUSDC_PayGuard.pptx
docs/시연_발표_핵심대본.md
```

## 5. 절대 올리면 안 되는 것

```text
.env
Nodit API Key가 들어간 파일
개인 비밀번호
MetaMask private key / seed phrase
```

`.gitignore`에 `.env`가 포함되어 있으므로 터미널 업로드 시 자동으로 제외됩니다.
