/**
 * OpenUda - 빌드 스크립트
 * 
 * 테스트 파일을 제외하고 프로덕션 배포를 위한 파일만 빌드합니다.
 * GitHub Actions CI/CD 파이프라인에서 사용됩니다.
 */

import fs from 'fs-extra';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

// 현재 파일 경로 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 경로 설정
const rootDir = resolve(__dirname, '..');
const distDir = resolve(rootDir, 'dist');

// 제외할 디렉토리 패턴
const excludedPatterns = [
  '**/tests/**',
  '**/test/**',
  '**/*.test.js',
  '**/node_modules/**',
  '**/build/**',
  '**/.github/**',
  '**/dist/**',
  '.git/**',
  '.gitignore',
  'package.json',
  'package-lock.json',
  'jest.config.js',
  'README.md'
];

async function buildProject() {
  try {
    console.log('빌드 시작...');
    
    // dist 디렉토리 초기화
    await fs.emptyDir(distDir);
    console.log(`${distDir} 디렉토리 초기화됨`);
    
    // 프로젝트 파일 모두 가져오기 (제외 패턴 적용)
    const allFiles = await glob('**/*', { 
      cwd: rootDir,
      dot: false,
      ignore: excludedPatterns,
      nodir: true
    });
    
    console.log(`복사할 파일 수: ${allFiles.length}`);
    
    // 파일 복사
    for (const file of allFiles) {
      const srcPath = resolve(rootDir, file);
      const destPath = resolve(distDir, file);
      
      // 목적지 디렉토리 생성
      await fs.ensureDir(dirname(destPath));
      
      // 파일 복사
      await fs.copy(srcPath, destPath);
    }
    
    console.log('HTML 파일에서 개발용 스크립트 제거 중...');
    // HTML 파일 처리 (개발용 스크립트 제거)
    const htmlFiles = await glob('**/*.html', { cwd: distDir });
    
    for (const htmlFile of htmlFiles) {
      const filePath = resolve(distDir, htmlFile);
      let content = await fs.readFile(filePath, 'utf8');
      
      // 테스트 또는 개발 관련 스크립트를 제거하는 정규식 패턴
      content = content.replace(/<!-- DEV-ONLY-START -->[\s\S]*?<!-- DEV-ONLY-END -->/g, '');
      
      // 수정된 HTML 저장
      await fs.writeFile(filePath, content, 'utf8');
    }
    
    console.log('버전 정보 추가 중...');
    // index.html에 빌드 버전 정보 추가
    const indexPath = resolve(distDir, 'index.html');
    if (await fs.pathExists(indexPath)) {
      let indexContent = await fs.readFile(indexPath, 'utf8');
      const buildDate = new Date().toISOString();
      const versionInfo = `<!-- Build: ${buildDate} -->`;
      
      // 헤드 태그에 빌드 정보 추가
      indexContent = indexContent.replace('</head>', `  ${versionInfo}\n</head>`);
      await fs.writeFile(indexPath, indexContent, 'utf8');
    }
    
    console.log('빌드 완료!');
    console.log(`결과물: ${distDir}`);
    return true;
    
  } catch (error) {
    console.error('빌드 중 오류 발생:', error);
    process.exitCode = 1;
    return false;
  }
}

// 빌드 실행
buildProject();
