export const ko = {
  "app.title": "Phonara — 무료 부수입 플랫폼",
  "app.tagline": "0초 진입 · 3초 첫 보상 · 12초 첫 공유",

  "nav.home": "홈",
  "nav.missions": "미션",
  "nav.play": "무료플레이",
  "nav.wallet": "지갑",
  "nav.trade": "트레이드",
  "nav.slots": "슬롯",
  "nav.refer": "친구추천",
  "nav.account": "계정",

  "common.loading": "불러오는 중…",
  "common.comingSoon": "곧 공개돼요",
  "common.pr": "PR-{n} 구현",

  "presence.region.active": "{cityKo} 지금 활발해요 🔥",
  "presence.region.rising": "{cityKo} 참여가 늘고 있어요",
  "presence.reward.waveOpened": "새 리워드 웨이브가 방금 열렸어요",
  "presence.countries.joining": "{count}개국에서 참여 중",
  "presence.mission.tonightSurge": "오늘 밤 미션 트래픽이 급상승 중",
  "presence.global.spike": "글로벌 활동 급증 감지",
  "presence.streak.surge": "연속 출석 도전이 폭발 중",
  "presence.install.global": "전 세계에서 설치가 계속되고 있어요",
  "presence.online.now": "{count}명 지금 참여 중",

  "presence.pulse.hot": "HOT NOW",
  "presence.pulse.trending": "TRENDING",
  "presence.pulse.globalSurge": "GLOBAL SURGE",
  "presence.pulse.limitedWave": "LIMITED WAVE",
  "presence.pulse.steady": "STEADY",

  "pwa.update.title": "새 버전이 준비됐어요",
  "pwa.update.action": "지금 업데이트",
  "pwa.install.title": "홈 화면에 추가하기",
  "pwa.install.action": "설치",
  "pwa.install.ios": "Safari 공유 → '홈 화면에 추가'를 눌러주세요",
} as const;

export type KoKey = keyof typeof ko;
