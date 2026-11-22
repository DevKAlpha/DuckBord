/**
 * Board templates in Korean. Mirrors locales/es.ts (the source): same ids,
 * columns, WIP limits, labels and example cards, translated.
 *
 * The Scrum columns keep their English names, as in GitHub Projects and as
 * most Korean dev teams use them. Gherkin uses its Korean keywords
 * (조건 / 만일 / 그러면 / 그리고).
 */
import type { BoardTemplate } from '../model';

export const USER_STORY_TEMPLATE = `**누가:** [역할]
**무엇을:** [기능]
**왜:** [얻는 이점]

### 세부 사항과 가정
* [알고 있는 내용을 적어 주세요]

### 인수 조건
\`\`\`gherkin
조건 [어떤 상황]
만일 [어떤 행동을 하면]
그러면 [행동의 결과를 확인한다]
\`\`\``;

const story = (s: {
  role: string;
  need: string;
  benefit: string;
  details: string[];
  gherkin: string[];
}) => `**누가:** ${s.role}
**무엇을:** ${s.need}
**왜:** ${s.benefit}

### 세부 사항과 가정
${s.details.map((d) => `* ${d}`).join('\n')}

### 인수 조건
\`\`\`gherkin
${s.gherkin.join('\n')}
\`\`\``;

export const NETWORK_CHANGE_TEMPLATE = `**변경 유형:** 표준 / 일반 / 긴급
**대상 장비:** [호스트명, IP, 사이트]
**영향:** [영향받는 서비스, 사용자, VLAN 또는 회선]

### 작업 계획 (MOP)
1. 현재 설정 백업
2. [단계 또는 명령어]

### 롤백 계획
1. [이전 상태로 되돌리는 방법]

### 검증
- [ ] [대상]으로 ping / traceroute
- [ ] show ip route / show interfaces [인터페이스]
- [ ] 30분 동안 알람 없이 모니터링

### 작업 시간
[날짜, 시간, 소요 시간]`;

const networkChange = (c: {
  kind: string;
  devices: string;
  impact: string;
  steps: string[];
  rollback: string[];
  checks: string[];
}) => `**변경 유형:** ${c.kind}
**대상 장비:** ${c.devices}
**영향:** ${c.impact}

### 작업 계획 (MOP)
1. 현재 설정 백업
${c.steps.map((s, i) => `${i + 2}. ${s}`).join('\n')}

### 롤백 계획
${c.rollback.map((s, i) => `${i + 1}. ${s}`).join('\n')}

### 검증
${c.checks.map((s) => `- [ ] ${s}`).join('\n')}

### 작업 시간
미정`;

export const IT_TICKET_TEMPLATE = `**요청 유형:** 장애 / 서비스 요청 / 접근 권한 / 변경
**요청자:** [이름, 부서, 연락처]
**대상 장비 또는 서비스:** [호스트명, 자산 또는 애플리케이션]
**영향도:** 높음 (부서 전체 또는 핵심 서비스) / 보통 / 낮음 (한 명)
**긴급도:** 높음 (업무 불가) / 보통 / 낮음

### 설명
[무슨 일이 언제부터 일어났는지, 정확한 오류 메시지]

### 이미 시도한 것
* [재시작, 다른 PC, 다른 네트워크…]

### 해결 내용
[원인과 적용한 해결책 (지식 베이스용)]`;

const itTicket = (t: {
  kind: string;
  requester: string;
  affected: string;
  impact: string;
  urgency: string;
  description: string;
  tried: string[];
}) => `**요청 유형:** ${t.kind}
**요청자:** ${t.requester}
**대상 장비 또는 서비스:** ${t.affected}
**영향도:** ${t.impact}
**긴급도:** ${t.urgency}

### 설명
${t.description}

### 이미 시도한 것
${t.tried.map((s) => `* ${s}`).join('\n')}

### 해결 내용
대기 중`;

export const CONTENT_BRIEF_TEMPLATE = `**플랫폼과 형식:** [롱폼 영상, 쇼츠, 릴스, 팟캐스트, 게시물, 뉴스레터…]
**대상:** [시청자와 그들이 원하는 것]
**훅:** [첫 문장 또는 처음 3초]

### 대본 또는 핵심 포인트
1. [핵심 아이디어]
2. [예시 또는 이야기]

### 행동 유도 (CTA)
[구독, 댓글, 프로필 링크…]

### 게시 전 확인
- [ ] 제목과 썸네일
- [ ] 설명, 해시태그, 링크
- [ ] 자막
- [ ] 사용 권한이 있는 음악과 이미지

### 결과 (7일 후)
조회수: · 시청 지속률: · 댓글:`;

const contentBrief = (c: {
  format: string;
  audience: string;
  hook: string;
  points: string[];
  cta: string;
}) => `**플랫폼과 형식:** ${c.format}
**대상:** ${c.audience}
**훅:** ${c.hook}

### 대본 또는 핵심 포인트
${c.points.map((p, i) => `${i + 1}. ${p}`).join('\n')}

### 행동 유도 (CTA)
${c.cta}

### 게시 전 확인
- [ ] 제목과 썸네일
- [ ] 설명, 해시태그, 링크
- [ ] 자막
- [ ] 사용 권한이 있는 음악과 이미지

### 결과 (7일 후)
조회수: · 시청 지속률: · 댓글:`;

const GITHUB_BOARD = {
  columns: [
    'New issues',
    'Icebox',
    'Product Backlog',
    'Sprint Backlog',
    'In progress',
    'In review',
    'Done',
  ],
  columnDescriptions: [
    '막 들어옴, 아직 다듬지 않음',
    '누군가 가져갈 준비가 됨',
    '아직 시작하지 않음',
    '이번 스프린트에 약속함',
    '지금 작업 중',
    '리뷰 대기 중',
    '완료됨',
  ],
  wipLimits: [null, null, 5, null, 3, 5, null],
};

export const TEMPLATES_KO: readonly BoardTemplate[] = [
  {
    id: 'scrum',
    profile: 'technical',
    name: '스크럼',
    description:
      'Gherkin 인수 조건, 스토리 포인트, WIP 제한이 있는 사용자 스토리. 린 흐름: 시작보다 마무리를 먼저.',
    ...GITHUB_BOARD,
    labels: [
      { name: 'enhancement', color: 'blue' },
      { name: 'bug', color: 'red' },
      { name: 'technical debt', color: 'orange' },
    ],
    cardTemplate: USER_STORY_TEMPLATE,
    cards: [
      {
        column: 0,
        title: '이 보드 사용법',
        patch: {
          description: `흐름: 아이디어는 **New Issues**로 들어옵니다. 다듬어지면(스토리 + 인수 조건 + 스토리 포인트) 가치 순으로 정렬된 **Product Backlog**로 이동합니다. 우선순위가 아닌 것은 **Icebox**에서 기다립니다.

계획 회의에서 팀은 스프린트에 들어갈 만큼 **Sprint Backlog**로 가져옵니다.

적용한 애자일·린 원칙:
* 가치를 일찍, 자주 전달하기: 작은 스토리 (8포인트 이하, 13이면 나누기).
* 진행 중인 작업(WIP) 제한: Product Backlog 5, In progress 3, In review 5. 열이 빨개지면 새 일을 시작하기 전에 마무리하세요.
* 일을 밀어 넣지 말고 당겨 오기 (pull).
* 낭비 없애기: 인수 조건이 없으면 스프린트에 넣지 않기.
* 지속적인 개선: 회고 때마다 흐름을 점검하기.`,
        },
      },
      {
        column: 1,
        title: '"좋아요"로 상품 평가하기',
        labels: ['enhancement'],
        patch: {
          description: story({
            role: '시스템 사용자',
            need: '상품에 "좋아요"를 누르기',
            benefit: '내 선호를 표현할 수 있다',
            details: ['사용자는 로그인되어 있어야 한다', '상품당 "좋아요"는 하나만'],
            gherkin: [
              '조건 나는 로그인한 사용자이다',
              '그리고 카탈로그에 상품이 있다',
              '만일 상품에 "좋아요"를 누르면',
              '그러면 시스템이 내 선호를 기록한다',
            ],
          }),
        },
      },
      {
        column: 2,
        title: '상품 필터링',
        labels: ['enhancement'],
        patch: {
          type: 'feature',
          priority: 'medium',
          storyPoints: 5,
          description: story({
            role: '시스템 사용자',
            need: '상품의 일부만 조회하기',
            benefit: '원하는 조건에 맞는 상품을 찾는다',
            details: ['카테고리, 가격, 인기순 필터', '페이지로 나뉜 결과'],
            gherkin: [
              '조건 카탈로그에 상품이 있다',
              '만일 검색 필터를 적용하면',
              '그러면 시스템은 조건에 맞는 상품만 보여 준다',
            ],
          }),
        },
      },
      {
        column: 3,
        title: '상품 목록 보기',
        labels: ['enhancement'],
        patch: {
          type: 'feature',
          priority: 'high',
          storyPoints: 3,
          sprint: 'Sprint 1',
          description: story({
            role: '시스템 사용자',
            need: '카탈로그의 모든 상품 목록 보기',
            benefit: '선택할 수 있는 상품을 둘러볼 수 있다',
            details: ['목록은 페이지로 나뉠 수 있다'],
            gherkin: [
              '조건 카탈로그에 상품이 있다',
              '만일 상품 목록을 요청하면',
              '그러면 시스템은 모든 상품을 보여 준다',
            ],
          }),
        },
      },
      {
        column: 4,
        title: '배포 자동화',
        labels: ['technical debt'],
        patch: {
          type: 'task',
          priority: 'medium',
          storyPoints: 8,
          sprint: 'Sprint 1',
          description: story({
            role: '개발 팀',
            need: '클라우드에 자동으로 배포하기',
            benefit: '변경 사항을 빠르고 안정적으로 전달한다',
            details: ['CI/CD 파이프라인을 사용한다', '변경이 승인된 뒤에 배포한다'],
            gherkin: [
              '조건 코드에 변경이 생겼다',
              '만일 변경이 승인되고 병합되면',
              '그러면 시스템이 자동으로 배포된다',
            ],
          }),
        },
      },
      {
        column: 6,
        title: '완료의 정의 (DoD)',
        patch: {
          description: `스토리는 다음일 때 **완료**입니다:
* 모든 인수 조건을 충족한다.
* 코드 리뷰를 마쳤다 (풀 리퀘스트 승인).
* 자동화 테스트가 있고 CI에서 통과한다.
* 배포되었고 프로덕트 오너가 승인했다.`,
        },
      },
    ],
  },
  {
    id: 'bug-tracker',
    profile: 'technical',
    name: '이슈와 DevOps',
    description: '"신규"부터 "해결됨"까지 버그와 장애를 분류합니다.',
    columns: ['신규', '분류', '진행 중', '검증', '해결됨'],
    labels: [
      { name: '프로덕션', color: 'red' },
      { name: '스테이징', color: 'yellow' },
      { name: 'CI/CD', color: 'orange' },
    ],
    cards: [
      {
        column: 0,
        title: 'CSV 내보내기 시 500 오류',
        labels: ['프로덕션'],
        patch: { type: 'bug', priority: 'high' },
      },
      {
        column: 1,
        title: 'e2e 테스트에서 느린 파이프라인',
        labels: ['CI/CD'],
        patch: { type: 'task', priority: 'medium' },
      },
    ],
  },
  {
    id: 'network',
    profile: 'technical',
    name: '네트워크',
    description:
      '롤백 계획, 승인, 작업 시간이 있는 네트워크 변경. 라우팅, VLAN, 방화벽, VPN, Wi-Fi.',
    columns: ['요청', '설계', '승인 (CAB)', '작업 예정', '적용', '검증', '종료'],
    columnDescriptions: [
      '막 들어온 변경과 장애',
      '토폴로지, 주소 체계, 계획 (MOP)',
      '변경 위원회의 승인 대기',
      '승인됨, 작업 날짜와 시간 확정',
      '지금 장비에 적용 중',
      '변경 후 테스트와 모니터링',
      '검증과 문서화 완료',
    ],
    wipLimits: [null, 4, null, null, 2, 3, null],
    labels: [
      { name: '라우팅', color: 'blue' },
      { name: '스위칭/VLAN', color: 'green' },
      { name: '방화벽', color: 'red' },
      { name: 'VPN', color: 'purple' },
      { name: 'Wi-Fi', color: 'yellow' },
      { name: '모니터링', color: 'orange' },
    ],
    cardTemplate: NETWORK_CHANGE_TEMPLATE,
    cards: [
      {
        column: 0,
        title: '이 보드 사용법',
        patch: {
          description: `네트워크 변경 관리 흐름:
* **요청**: 모든 변경이나 장애는 카드로 들어옵니다. 장애는 *bug* 유형입니다.
* **설계**: 템플릿을 채우세요 (장비, 영향, MOP, 롤백, 테스트).
* **승인 (CAB)**: 롤백 계획이 없으면 승인하지 않습니다.
* **작업 예정**: 카드에 작업 날짜를 넣으세요.
* **적용**: WIP 제한 2. 동시에 적은 변경 = 장애 위험 감소.
* **검증**: 테스트를 실행하고, 종료 전에 모니터링을 지켜보세요.

팁:
* 장비를 만지기 전에 설정(running-config)을 백업하세요.
* 라벨로 각 변경이 어느 계층에 영향을 주는지 표시하세요.
* 스토리 포인트 = 변경의 위험과 작업량.`,
        },
      },
      {
        column: 0,
        title: '북부 지점 WAN 회선 패킷 손실',
        labels: ['모니터링', '라우팅'],
        patch: { type: 'bug', priority: 'high' },
      },
      {
        column: 1,
        title: '게스트 네트워크용 새 VLAN 30',
        labels: ['스위칭/VLAN', 'Wi-Fi'],
        patch: {
          type: 'feature',
          priority: 'medium',
          storyPoints: 3,
          description: networkChange({
            kind: '일반',
            devices: 'SW-CORE-01, SW-ACC-03/04, WLC-01',
            impact: '기존 사용자 영향 없음, 게스트용 분리 네트워크 신설',
            steps: [
              '코어와 액세스 스위치에 VLAN 30 (GUEST) 생성',
              'DHCP 릴레이와 함께 SVI 10.30.0.1/24 설정',
              'AP 방향 트렁크에 VLAN 추가',
              '컨트롤러에서 VLAN 30에 매핑된 "Guest" SSID 생성',
              'ACL: VLAN 30은 인터넷만 허용, 내부망 접근 차단',
            ],
            rollback: ['SSID와 VLAN 30 삭제', '백업한 running-config 복원'],
            checks: [
              '"Guest"에 접속한 단말이 10.30.0.x IP를 받음',
              'VLAN 30에서 ping 8.8.8.8: 정상',
              'VLAN 30에서 10.10.0.0/16으로 ping: 차단됨',
            ],
          }),
        },
      },
      {
        column: 2,
        title: 'DMZ의 새 웹 서버로 443/TCP 열기',
        labels: ['방화벽'],
        patch: { type: 'task', priority: 'medium', storyPoints: 2 },
      },
      {
        column: 3,
        title: '경계 라우터 운영체제 업그레이드',
        labels: ['라우팅'],
        patch: { type: 'task', priority: 'high', storyPoints: 5, sprint: '토요일 작업' },
      },
      {
        column: 4,
        title: '남부 지사와 IPsec 터널',
        labels: ['VPN'],
        patch: { type: 'feature', priority: 'medium', storyPoints: 5 },
      },
      {
        column: 5,
        title: '2층 Wi-Fi 커버리지',
        labels: ['Wi-Fi', '모니터링'],
        patch: { type: 'task', priority: 'low', storyPoints: 2 },
      },
    ],
  },
  {
    id: 'it-support',
    profile: 'technical',
    name: 'IT 헬프데스크',
    description:
      '요청 유형, 영향도와 긴급도에 따른 우선순위, SLA, 2차 지원 에스컬레이션이 있는 지원 티켓.',
    columns: [
      '신규',
      '처리 중',
      '고객 응답 대기',
      '에스컬레이션',
      '외부 업체 대기',
      '해결됨',
      '종료',
    ],
    columnDescriptions: [
      '지원 대기: 아직 배정이나 답변 없음',
      '담당자가 처리하고 있음',
      '요청자의 정보나 확인이 필요함',
      '2차 지원이나 전문가에게 넘어감',
      '업체, 구매, 보증 수리에 달려 있음',
      '해결책 적용, 사용자가 확인',
      '확인과 문서화 완료',
    ],
    wipLimits: [null, 5, null, 3, null, null, null],
    labels: [
      { name: '장애', color: 'red' },
      { name: '요청', color: 'blue' },
      { name: '접근 권한', color: 'purple' },
      { name: '하드웨어', color: 'orange' },
      { name: '소프트웨어', color: 'green' },
      { name: '변경', color: 'yellow' },
    ],
    cardTemplate: IT_TICKET_TEMPLATE,
    cards: [
      {
        column: 0,
        title: '이 보드 사용법',
        patch: {
          description: `헬프데스크 흐름:
* **신규**: 모든 티켓은 여기로 들어옵니다. 라벨로 요청 유형을, 그리고 우선순위를 정하세요.
* **처리 중**: 담당자가 가져갑니다 (자신에게 배정). 열마다 WIP 제한 5.
* **고객 응답 대기**: 요청자의 정보나 테스트가 필요합니다. SLA가 멈춥니다.
* **에스컬레이션**: 2차 지원 (네트워크, 시스템, 애플리케이션). WIP 제한 3.
* **외부 업체 대기**: 업체, 구매, 보증 수리.
* **해결됨**: 해결책 적용. 사용자가 확인하면 **종료**로 이동합니다.

우선순위 = 영향도 × 긴급도이며, SLA를 정합니다:
* **높음**: 첫 응답 30분, 해결 4시간.
* **보통**: 첫 응답 4시간, 해결 1영업일.
* **낮음**: 첫 응답 1영업일, 해결 3영업일.

팁:
* 티켓에 SLA 마감일을 넣으세요. 기한이 되면 빨갛게 보입니다.
* 카드 유형: *bug* = 장애, *task* = 요청, *feature* = 변경.
* 종료할 때 해결 내용을 채우세요. 팀의 지식 베이스가 됩니다.`,
        },
      },
      {
        column: 0,
        title: '3층 프린터로 인쇄가 안 돼요',
        labels: ['장애', '하드웨어'],
        patch: {
          type: 'bug',
          priority: 'medium',
          description: itTicket({
            kind: '장애',
            requester: '김지은, 회계팀, 내선 214',
            affected: 'PRN-3F-01 (HP LaserJet)',
            impact: '보통 (3층 전체)',
            urgency: '보통',
            description:
              '오늘 아침부터 "프린터 오프라인" 오류와 함께 작업이 대기열에 남아 있습니다.',
            tried: ['프린터 껐다 켜기', '다른 PC에서 인쇄: 같은 오류'],
          }),
        },
        dueInDays: 1,
      },
      {
        column: 0,
        title: '영업팀 신규 입사자 계정 생성',
        labels: ['접근 권한'],
        patch: { type: 'task', priority: 'medium' },
        dueInDays: 2,
      },
      {
        column: 1,
        title: 'Outlook 메일 동기화가 안 됨',
        labels: ['장애', '소프트웨어'],
        patch: { type: 'bug', priority: 'high' },
        dueInDays: 0,
      },
      {
        column: 2,
        title: '경영지원실 노트북에 PDF 편집기 설치',
        labels: ['요청', '소프트웨어'],
        patch: {
          type: 'task',
          priority: 'low',
          description: '부서장의 라이선스 승인을 기다리는 중입니다.',
        },
      },
      {
        column: 3,
        title: 'VPN이 10분마다 끊김',
        labels: ['장애'],
        patch: { type: 'bug', priority: 'high', description: '네트워크 팀으로 에스컬레이션함.' },
        dueInDays: 0,
      },
      {
        column: 4,
        title: '화면이 깨진 노트북: 보증 수리',
        labels: ['하드웨어'],
        patch: { type: 'task', priority: 'medium' },
      },
      {
        column: 5,
        title: '메일 비밀번호 초기화',
        labels: ['접근 권한'],
        patch: { type: 'task', priority: 'low' },
      },
      {
        column: 6,
        title: '안내데스크 PC 백신 업데이트',
        labels: ['변경', '소프트웨어'],
        patch: { type: 'feature', priority: 'low' },
      },
    ],
  },
  {
    id: 'personal',
    profile: 'simple',
    name: '내 할 일',
    description: '하루를 정리하는 데 필요한 것만.',
    columns: ['할 일', '하는 중', '완료'],
    labels: [
      { name: '집', color: 'green' },
      { name: '일', color: 'blue' },
      { name: '급함', color: 'red' },
    ],
    cards: [
      { column: 0, title: '이 카드를 "하는 중"으로 끌어 보세요', labels: ['집'] },
      { column: 0, title: '카드를 눌러 메모나 날짜를 추가하세요', labels: ['일'] },
      { column: 2, title: '첫 보드 만들기', labels: [] },
    ],
  },
  {
    id: 'team-project',
    profile: 'simple',
    name: '팀 프로젝트',
    description: '마케팅, 영업, 행사를 위한 아이디어, 할 일, 결과물.',
    columns: ['아이디어', '할 일', '진행 중', '검토 중', '완료'],
    labels: [
      { name: '마케팅', color: 'purple' },
      { name: '영업', color: 'green' },
      { name: '디자인', color: 'yellow' },
    ],
    cards: [
      { column: 0, title: '출시 캠페인', labels: ['마케팅'] },
      { column: 1, title: '고객용 발표 자료 준비', labels: ['영업'] },
      { column: 2, title: '새 로고', labels: ['디자인'] },
    ],
  },
  {
    id: 'study',
    profile: 'simple',
    name: '공부',
    description: '과목, 과제, 시험을 한눈에.',
    columns: ['할 것', '공부 중', '복습', '합격'],
    labels: [
      { name: '시험', color: 'red' },
      { name: '과제', color: 'blue' },
    ],
    cards: [
      { column: 0, title: '역사 기말 과제', labels: ['과제'] },
      { column: 1, title: '수학 3단원', labels: ['시험'] },
    ],
  },
  {
    id: 'content',
    profile: 'simple',
    everyone: true,
    lockedProfile: true,
    name: '콘텐츠 크리에이터',
    description: '아이디어부터 게시까지: 플랫폼별 대본, 촬영, 편집, 게시 날짜.',
    columns: ['아이디어', '대본', '촬영', '편집', '예약됨', '게시됨'],
    columnDescriptions: [
      '떠오르는 건 뭐든지, 거르지 말고',
      '훅, 구성, 행동 유도',
      '촬영 준비 완료 또는 촬영 중',
      '편집, 자막, 썸네일',
      '게시 날짜와 시간이 정해짐',
      '공개됨: 결과를 확인하세요',
    ],
    wipLimits: [null, null, null, 2, null, null],
    labels: [
      { name: 'YouTube', color: 'red' },
      { name: 'TikTok', color: 'purple' },
      { name: 'Instagram', color: 'orange' },
      { name: '팟캐스트', color: 'green' },
      { name: '블로그 / 뉴스레터', color: 'blue' },
      { name: '협업', color: 'yellow' },
    ],
    cardTemplate: CONTENT_BRIEF_TEMPLATE,
    cards: [
      {
        column: 0,
        title: '이 보드 사용법',
        patch: {
          description: `콘텐츠 하나에 카드 하나, 아이디어부터 게시까지:
* **아이디어**: 거르지 말고 다 적으세요. 라벨은 어느 플랫폼용인지 알려 줍니다.
* **대본**: 브리프를 채우세요 (훅, 핵심 포인트, 행동 유도).
* **촬영**과 **편집**: 편집은 한 번에 최대 2개.
* **예약됨**: 게시 날짜를 카드의 마감일로 넣으세요.
* **게시됨**: 7일 뒤 결과를 브리프에 적으세요.

팁:
* 대본, 클립, 썸네일을 링크로 첨부하세요 (Drive, OneDrive…).
* 연결에서 게시 날짜를 캘린더에 추가할 수 있습니다.
* 같은 콘텐츠를 여러 플랫폼에: 라벨 여러 개를 단 카드 하나.`,
        },
      },
      { column: 0, title: '처음 시작할 때 했던 실수 10가지', labels: ['YouTube'] },
      {
        column: 0,
        title: '내 작업 공간 비하인드',
        labels: ['Instagram', 'TikTok'],
      },
      {
        column: 1,
        title: '12화: 생산성 인터뷰',
        labels: ['팟캐스트', '협업'],
        patch: {
          description: contentBrief({
            format: '팟캐스트 40분 에피소드 (짧은 클립 3개 포함)',
            audience: '재택근무를 하며 쉽게 집중이 흐트러지는 사람들',
            hook: '"하루 4시간 일하는데 전보다 더 많이 해내요. 방법을 알려 드릴게요."',
            points: [
              '게스트 소개',
              '게스트의 아침 루틴',
              '사용하는 도구 3가지',
              '마지막 짧은 질문',
            ],
            cta: '구독하고 여러분의 꿀팁을 댓글로 알려 주세요',
          }),
        },
        dueInDays: 9,
      },
      { column: 2, title: '튜토리얼: 휴대폰으로 영상 편집하기', labels: ['TikTok'], dueInDays: 6 },
      {
        column: 3,
        title: '헤드폰 리뷰 (브랜드 협업)',
        labels: ['YouTube', '협업'],
        dueInDays: 4,
      },
      { column: 4, title: '이달의 뉴스레터', labels: ['블로그 / 뉴스레터'], dueInDays: 2 },
      { column: 5, title: '릴스: 나의 아침 루틴', labels: ['Instagram'] },
    ],
  },
  {
    id: 'blank',
    profile: 'simple',
    everyone: true,
    name: '빈 보드',
    description: '빈 열 세 개. 나머지는 직접 정하세요.',
    columns: ['할 일', '하는 중', '완료'],
    labels: [],
    cards: [],
  },
];
