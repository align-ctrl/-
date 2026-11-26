import { ArrowRight, Clock, Share, Smartphone, SquarePlus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { PublicConfig } from '../types';
import { BottomBar, Button, Modal } from '../components/ui';
import { ToothIllustration } from '../components/Illustration';
import { useInstall } from '../lib/pwa';

export function Home({ config, onStart }: { config: PublicConfig; onStart: () => void }) {
  const { texts, hospital } = config;
  const install = useInstall();
  const [iosGuide, setIosGuide] = useState(false);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <div className="safe-top px-6 pt-7">
        <img src={hospital.logoUrl} alt={`${hospital.name} ${hospital.nameEn}`} className="mx-auto h-auto w-[min(78%,300px)] animate-fadeUp" />
      </div>

      <main className="flex flex-1 flex-col items-center px-6 pt-4 text-center">
        <ToothIllustration className="h-36 w-auto min-[400px]:h-44 animate-fadeUp [animation-delay:80ms]" />
        <h1 className="mt-2 animate-fadeUp text-[26px] font-bold leading-snug tracking-tight text-navy [animation-delay:140ms]">{texts.homeTitle}</h1>
        <p className="mt-2 animate-fadeUp text-[16px] text-ink-600 [animation-delay:180ms]">{texts.homeSubtitle}</p>

        <div className="mt-6 w-full animate-fadeUp rounded-2xl bg-mist px-5 py-4 text-left [animation-delay:240ms]">
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-accent shadow-card">
              <Sparkles className="h-4 w-4" />
            </span>
            <p className="text-[15px] leading-relaxed text-ink-600">{texts.homeGuide}</p>
          </div>
        </div>
      </main>

      <BottomBar sticky={false}>
        <Button onClick={onStart} icon={null}>
          리뷰 작성 시작하기 <ArrowRight className="h-5 w-5" />
        </Button>
        <p className="flex items-center justify-center gap-1.5 pt-1 text-[14px] font-medium text-ink-500">
          <Clock className="h-4 w-4" /> {texts.estimatedTime}
        </p>
        <p className="px-2 text-center text-[13px] leading-relaxed text-ink-400">{texts.homeNotice}</p>
        {install.kind && (
          <button
            onClick={() => (install.kind === 'prompt' ? install.prompt() : setIosGuide(true))}
            className="press mx-auto flex min-h-[44px] items-center gap-1.5 text-[13px] font-medium text-soft"
          >
            <Smartphone className="h-4 w-4" /> 홈 화면에 추가하기
          </button>
        )}
      </BottomBar>

      <Modal
        open={iosGuide}
        title="홈 화면에 추가하기"
        actions={<Button onClick={() => setIosGuide(false)}>확인</Button>}
      >
        <ol className="space-y-3 pt-2">
          <li className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mist text-navy"><Share className="h-5 w-5" /></span>
            Safari 하단의 <b className="text-navy">공유</b> 버튼을 누르세요.
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mist text-navy"><SquarePlus className="h-5 w-5" /></span>
            <b className="text-navy">홈 화면에 추가</b>를 선택하세요.
          </li>
        </ol>
      </Modal>
    </div>
  );
}
