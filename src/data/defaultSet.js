// 기본 문제집: "미래를 구하는 세계시민" (환경 · 빈곤 · 평화)
// 교사 화면에서 복제해 새 문제집을 만들 수 있습니다.

const T = (ko, en, zh, ru) => ({ ko, en, zh, ru });

export const DEFAULT_SET_ID = 'set_default_world_citizen';

export const DEFAULT_SET = {
  id: DEFAULT_SET_ID,
  title: T('미래를 구하는 세계시민', 'World Citizens Saving the Future', '拯救未来的世界公民', 'Граждане мира спасают будущее'),
  description: T(
    '기후 위기, 빈곤과 불평등, 전쟁과 난민. 미래의 세 장면에서 내린 선택이 지구의 운명을 바꿉니다.',
    'Climate crisis, poverty and inequality, war and refugees. Your choices in three scenes of the future change the fate of the Earth.',
    '气候危机、贫困与不平等、战争与难民。你在未来三个场景中的选择将改变地球的命运。',
    'Климатический кризис, бедность и неравенство, война и беженцы. Твой выбор в трёх сценах будущего изменит судьбу Земли.'
  ),
  axes: [
    { id: 'eco', name: T('환경', 'Environment', '环境', 'Экология'), color: '#15b886' },
    { id: 'solidarity', name: T('연대', 'Solidarity', '团结', 'Солидарность'), color: '#ff9f00' },
    { id: 'peace', name: T('평화', 'Peace', '和平', 'Мир'), color: '#3182f6' },
  ],
  startScore: 50,
  passScore: 70,
  minChars: {
    reflection: { ko: 15, en: 35, zh: 10, ru: 35 },
    reason: { ko: 5, en: 10, zh: 4, ru: 10 },
  },
  wizard: {
    name: T('크로노스', 'Chronos', '克罗诺斯', 'Хронос'),
    prologue: [
      T('드디어 만났군요, 시간 여행자여.',
        'At last we meet, time traveler.',
        '我们终于见面了，时间旅行者。',
        'Наконец-то мы встретились, путешественник во времени.'),
      T('나는 지구의 시간을 지켜보는 수호자, 크로노스입니다.',
        'I am Chronos, the guardian who watches over the time of the Earth.',
        '我是守护地球时间的守护者——克罗诺斯。',
        'Я Хронос, хранитель, который следит за временем Земли.'),
      T('미래의 지구가 위험합니다. 기후 위기, 빈곤과 불평등, 전쟁과 난민의 비극이 이어지고 있어요.',
        'The Earth of the future is in danger. Climate crisis, poverty and inequality, war and the tragedy of refugees go on and on.',
        '未来的地球正处于危险之中。气候危机、贫困与不平等、战争与难民的悲剧接连不断。',
        'Земля будущего в опасности. Климатический кризис, бедность и неравенство, война и трагедия беженцев не прекращаются.'),
      T('하지만 아직 늦지 않았습니다. 그대가 미래의 세 장면에서 내리는 선택이 지구의 운명을 바꿀 수 있습니다.',
        'But it is not too late. The choices you make in three scenes of the future can change the fate of the Earth.',
        '但现在还不算太晚。你在未来三个场景中做出的选择，可以改变地球的命运。',
        'Но ещё не поздно. Выбор, который ты сделаешь в трёх сценах будущего, может изменить судьбу Земли.'),
      T('정해진 정답은 없습니다. 선택할 때마다 그렇게 생각한 이유를 꼭 함께 남겨 주십시오.',
        'There is no fixed right answer. Each time you choose, please leave the reason for your thinking.',
        '这里没有固定的正确答案。每次做出选择时，请一定写下你这样想的理由。',
        'Готового правильного ответа нет. Каждый раз, делая выбор, обязательно напиши, почему ты так думаешь.'),
      T('준비되셨나요? 시간 여행을 시작하겠습니다.',
        'Are you ready? Let the journey through time begin.',
        '准备好了吗？时间旅行现在开始。',
        'Ты готов? Начинаем путешествие во времени.'),
    ],
  },
  stages: [
    {
      id: 's1',
      title: T('환경과 기후 위기', 'Environment and Climate Crisis', '环境与气候危机', 'Экология и климатический кризис'),
      year: T('2052년 여름', 'Summer 2052', '2052年夏天', 'Лето 2052 года'),
      place: T('해안 도시 네오코스트', 'Neocoast, a coastal city', '沿海城市“新海岸”', 'Прибрежный город Неокост'),
      description: T(
        '낮 기온이 45도를 넘고, 해안선에는 플라스틱 쓰레기가 쌓여 있어요. 하늘은 잿빛 스모그로 덮여 있어요.',
        'Daytime temperatures are above 45°C, and plastic waste is piled up along the coast. The sky is covered with gray smog.',
        '白天气温超过45度，海岸线上堆满了塑料垃圾。天空被灰色的雾霾笼罩着。',
        'Днём температура выше 45 градусов, а берег завален пластиковым мусором. Небо затянуто серым смогом.'
      ),
      mood: 'pensive',
      color: '#15b886',
      dilemmas: [
        {
          id: 'd1-1',
          title: T('바다를 뒤덮은 일회용 플라스틱', 'Disposable Plastic Covering the Sea', '覆盖大海的一次性塑料', 'Одноразовый пластик в океане'),
          context: T(
            '도시의 배달과 포장이 거의 다 일회용 플라스틱이에요. 바다거북과 물고기가 플라스틱을 삼키고 있어요. 하지만 다회용기로 바꾸면 가게들의 비용이 늘고 물건값이 오를 수 있어요.',
            'Almost all deliveries and packaging in the city use disposable plastic. Sea turtles and fish are swallowing it. But switching to reusable containers would raise costs for shops, and prices might go up.',
            '城市里的外卖和包装几乎都是一次性塑料。海龟和鱼类正在吞食塑料。但如果改用可重复使用的容器，商店的成本会增加，商品价格也可能上涨。',
            'Почти вся доставка и упаковка в городе — из одноразового пластика. Морские черепахи и рыбы глотают его. Но если перейти на многоразовую тару, расходы магазинов вырастут, и цены могут подняться.'
          ),
          hint: T(
            '지금의 편리함과 미래 세대의 건강을 비교해 보세요. 늘어나는 비용은 누가 어떻게 나눠 질 수 있을까요?',
            'Compare today\'s convenience with the health of future generations. Who could share the extra cost, and how?',
            '请比较一下眼前的便利和后代的健康。增加的成本可以由谁、以什么方式来分担？',
            'Сравни сегодняшнее удобство и здоровье будущих поколений. Кто и как мог бы разделить дополнительные расходы?'
          ),
          wizardLine: T(
            '작은 편리함도 쌓이면 바다 전체를 바꿉니다.',
            'Even small conveniences, piled up, can change the whole ocean.',
            '小小的便利积累起来，也会改变整片大海。',
            'Даже маленькие удобства, накапливаясь, меняют весь океан.'
          ),
          choices: [
            {
              id: 'c1',
              text: T(
                '가게와 시민의 부담을 줄이기 위해 일회용 플라스틱 사용을 지금처럼 허용한다.',
                'Keep allowing disposable plastic as it is, to reduce the burden on shops and citizens.',
                '为了减轻商店和市民的负担，像现在这样继续允许使用一次性塑料。',
                'Разрешить одноразовый пластик, как сейчас, чтобы не увеличивать нагрузку на магазины и жителей.'
              ),
              effects: { eco: -30, solidarity: 0, peace: 0 },
              feedbackTitle: T('당장은 편했지만…', 'Convenient for now, but…', '眼下很方便，但是……', 'Сейчас удобно, но…'),
              feedback: T(
                '물건값은 그대로였지만, 바다의 미세플라스틱이 식수까지 스며들어 시민 건강에 경고등이 켜졌어요.',
                'Prices stayed the same, but microplastics from the sea seeped into the drinking water, and warning lights went on for people\'s health.',
                '物价没有变化，但海洋中的微塑料渗入了饮用水，市民的健康亮起了红灯。',
                'Цены не изменились, но микропластик из моря попал в питьевую воду, и здоровье жителей оказалось под угрозой.'
              ),
            },
            {
              id: 'c2',
              text: T(
                '일회용품을 규제하고 다회용기 회수 시스템을 의무화한다.',
                'Regulate disposable products and make a reusable-container return system mandatory.',
                '限制一次性用品，并强制推行可重复使用容器的回收系统。',
                'Ограничить одноразовые товары и сделать обязательной систему возврата многоразовой тары.'
              ),
              effects: { eco: 35, solidarity: 15, peace: 10 },
              feedbackTitle: T('바다가 다시 살아났어요', 'The sea came back to life', '大海重新焕发了生机', 'Море снова ожило'),
              feedback: T(
                '처음엔 불편하다는 목소리도 있었지만, 플라스틱 쓰레기가 70% 줄고 산호초와 바다생물이 돌아왔어요.',
                'At first some people complained it was inconvenient, but plastic waste fell by 70%, and coral reefs and sea life came back.',
                '起初也有人抱怨不方便，但塑料垃圾减少了70%，珊瑚礁和海洋生物都回来了。',
                'Сначала некоторые жаловались на неудобства, но пластикового мусора стало на 70% меньше, а коралловые рифы и морские животные вернулись.'
              ),
            },
          ],
        },
        {
          id: 'd1-2',
          title: T('석탄 발전소냐, 재생에너지냐', 'Coal Power or Renewable Energy?', '燃煤电厂还是可再生能源？', 'Угольная электростанция или возобновляемая энергия?'),
          context: T(
            '전력 수요가 크게 늘었어요. 석탄 발전소를 더 지으면 전기 요금이 싸게 유지되지만 온실가스가 늘어요. 태양광·풍력 단지를 지으려면 큰 예산이 들고 전기 요금이 한동안 오를 수 있어요.',
            'Demand for electricity has grown a lot. Building more coal plants keeps electricity cheap but increases greenhouse gases. Building solar and wind farms needs a big budget, and electricity bills could rise for a while.',
            '电力需求大幅增加。多建燃煤电厂可以让电费保持便宜，但温室气体会增加。建设太阳能和风能发电站需要大量预算，电费也可能在一段时间内上涨。',
            'Спрос на электричество сильно вырос. Новые угольные станции сохранят дешёвое электричество, но увеличат выбросы парниковых газов. Солнечные и ветровые станции требуют большого бюджета, и счета за свет могут на время вырасти.'
          ),
          hint: T(
            '당장의 생활비 부담과 기후 변화로 생길 피해를 비교해 보세요. 가장 큰 피해를 입는 사람은 누구일까요?',
            'Compare the cost of living today with the damage climate change will cause. Who will be hurt the most?',
            '请比较眼前的生活费负担和气候变化将带来的损害。谁会受到最大的伤害？',
            'Сравни сегодняшние расходы на жизнь и ущерб от изменения климата. Кто пострадает больше всех?'
          ),
          wizardLine: T(
            '오늘의 값싼 전기가 내일의 비싼 대가가 되기도 합니다.',
            'Today\'s cheap electricity can become tomorrow\'s high price.',
            '今天的廉价电力，可能会变成明天昂贵的代价。',
            'Дешёвое электричество сегодня может обернуться высокой ценой завтра.'
          ),
          choices: [
            {
              id: 'c1',
              text: T(
                '전기 요금을 안정시키기 위해 석탄 발전소를 계속 가동한다.',
                'Keep the coal plants running to keep electricity bills stable.',
                '为了稳定电费，继续运营燃煤电厂。',
                'Продолжать работу угольных станций, чтобы счета за электричество оставались стабильными.'
              ),
              effects: { eco: -25, solidarity: -10, peace: 0 },
              feedbackTitle: T('하늘이 더 탁해졌어요', 'The sky grew darker', '天空变得更加浑浊', 'Небо стало ещё мутнее'),
              feedback: T(
                '요금은 싸게 유지됐지만 폭염과 산불이 잦아졌고, 많은 시민이 호흡기 질환으로 고생했어요.',
                'Bills stayed low, but heat waves and wildfires became more frequent, and many people suffered from breathing problems.',
                '电费虽然保持低廉，但热浪和山火变得频繁，许多市民饱受呼吸道疾病之苦。',
                'Счета остались низкими, но жара и лесные пожары стали чаще, и многие люди страдали от болезней дыхания.'
              ),
            },
            {
              id: 'c2',
              text: T(
                '낡은 석탄 발전소를 닫고 태양광·풍력 같은 재생에너지로 전환한다.',
                'Close old coal plants and switch to renewable energy such as solar and wind.',
                '关闭老旧的燃煤电厂，转向太阳能、风能等可再生能源。',
                'Закрыть старые угольные станции и перейти на возобновляемую энергию — солнечную и ветровую.'
              ),
              effects: { eco: 35, solidarity: 15, peace: 10 },
              feedbackTitle: T('맑은 하늘이 돌아왔어요', 'Clear skies returned', '蓝天回来了', 'Чистое небо вернулось'),
              feedback: T(
                '몇 년 동안은 요금 부담이 있었지만, 깨끗한 에너지가 안정적으로 공급되면서 탄소 배출이 크게 줄었어요.',
                'Bills were higher for a few years, but with a steady supply of clean energy, carbon emissions dropped sharply.',
                '虽然几年内电费负担有所增加，但随着清洁能源稳定供应，碳排放大幅减少了。',
                'Несколько лет счета были выше, но благодаря стабильной чистой энергии выбросы углерода сильно сократились.'
              ),
            },
          ],
        },
        {
          id: 'd1-3',
          title: T('매년 바꾸는 스마트폰', 'A New Smartphone Every Year', '每年都换的智能手机', 'Новый смартфон каждый год'),
          context: T(
            '지금 쓰는 스마트폰은 잘 작동해요. 그런데 친구들이 모두 새 폰을 쓰고 있어서 바꾸고 싶은 마음이 커요. 스마트폰 한 대를 만들 때 희귀 광물을 캐고 많은 탄소가 나와요.',
            'Your smartphone works fine. But all your friends have new phones, so you really want to change yours. Making one smartphone requires mining rare minerals and produces a lot of carbon.',
            '你现在用的手机运行良好。但朋友们都在用新手机，你也很想换一部。制造一部智能手机需要开采稀有矿物，还会排放大量碳。',
            'Твой смартфон отлично работает. Но у всех друзей новые телефоны, и тебе очень хочется поменять свой. Чтобы сделать один смартфон, добывают редкие минералы и выбрасывают много углерода.'
          ),
          hint: T(
            '내 선택 하나는 작아 보여도, 같은 선택을 하는 사람이 수억 명이라면 어떨까요?',
            'One choice may look small, but what if hundreds of millions of people make the same choice?',
            '一个选择看起来很小，但如果有几亿人都做出同样的选择呢？',
            'Один выбор кажется маленьким, но что если такой же выбор сделают сотни миллионов людей?'
          ),
          wizardLine: T(
            '이번 선택은 도시가 아니라 바로 그대의 일상에 관한 것입니다.',
            'This choice is not about a city — it is about your own everyday life.',
            '这次的选择与城市无关，而是关于你自己的日常生活。',
            'Этот выбор не о городе, а о твоей собственной повседневной жизни.'
          ),
          choices: [
            {
              id: 'c1',
              text: T(
                '친구들과 어울리기 위해 매년 새 스마트폰으로 바꾼다.',
                'Get a new smartphone every year to fit in with friends.',
                '为了和朋友们合群，每年都换新手机。',
                'Каждый год покупать новый смартфон, чтобы не отставать от друзей.'
              ),
              effects: { eco: -25, solidarity: -10, peace: 0 },
              feedbackTitle: T('전자 쓰레기 산이 높아졌어요', 'The mountain of e-waste grew', '电子垃圾堆越来越高', 'Гора электронного мусора выросла'),
              feedback: T(
                '버려진 기기에서 중금속이 땅과 지하수로 스며들고, 광물을 캐느라 열대우림이 파괴됐어요.',
                'Heavy metals from thrown-away devices leaked into the soil and groundwater, and rainforests were destroyed for mining.',
                '被丢弃的设备中的重金属渗入土壤和地下水，为了开采矿物，热带雨林也遭到了破坏。',
                'Тяжёлые металлы из выброшенных устройств попали в почву и грунтовые воды, а ради добычи минералов вырубали тропические леса.'
              ),
            },
            {
              id: 'c2',
              text: T(
                '배터리와 부품을 고쳐 가며 오래 쓰고, 다 쓴 기기는 재활용 센터에 보낸다.',
                'Use the phone for a long time by repairing the battery and parts, and send old devices to a recycling center.',
                '通过维修电池和零件长期使用手机，用完的设备送到回收中心。',
                'Пользоваться телефоном долго, меняя батарею и детали, а старые устройства сдавать на переработку.'
              ),
              effects: { eco: 30, solidarity: 15, peace: 10 },
              feedbackTitle: T('자원이 순환하기 시작했어요', 'Resources began to circulate', '资源开始循环利用', 'Ресурсы пошли по кругу'),
              feedback: T(
                '새 기능은 조금 늦게 만났지만, 기기를 오래 쓰는 사람이 늘면서 자원과 탄소를 크게 아낄 수 있었어요.',
                'You got new features a little later, but as more people kept their devices longer, a lot of resources and carbon were saved.',
                '虽然晚一点才用上新功能，但随着长期使用设备的人越来越多，大量资源和碳排放得以节省。',
                'Новые функции появились у тебя чуть позже, но чем больше людей дольше пользуются устройствами, тем больше ресурсов и углерода удаётся сберечь.'
              ),
            },
          ],
        },
      ],
      reflection: {
        title: T('환경을 위한 나의 약속', 'My Promise for the Environment', '我为环境许下的承诺', 'Моё обещание ради природы'),
        guide: T(
          '지구 환경을 지키고 자원을 아끼기 위해 내가 일상에서 실천할 수 있는 약속은 무엇인가요?',
          'What promise can you keep in your daily life to protect the environment and save resources?',
          '为了保护地球环境、节约资源，你在日常生活中可以践行什么承诺？',
          'Какое обещание ты можешь выполнять каждый день, чтобы беречь природу и ресурсы?'
        ),
        placeholder: T(
          '예) 스마트폰을 고장 날 때까지 아껴 쓰고, 일회용 컵 대신 텀블러를 챙길게요.',
          'e.g. I will use my phone until it breaks and carry a tumbler instead of using paper cups.',
          '例：我会一直用手机直到坏掉，并随身带水杯代替一次性杯子。',
          'Например: я буду пользоваться телефоном, пока он не сломается, и носить с собой термокружку вместо одноразовых стаканов.'
        ),
      },
    },
    {
      id: 's2',
      title: T('빈곤과 불평등', 'Poverty and Inequality', '贫困与不平等', 'Бедность и неравенство'),
      year: T('2060년 가을', 'Autumn 2060', '2060年秋天', 'Осень 2060 года'),
      place: T('부유층의 에어로 돔과 바깥의 더스트 구역', 'The rich Aero Dome and the Dust Zone outside', '富人的“空中穹顶”与外面的“尘土区”', 'Аэрокупол для богатых и Пыльная зона снаружи'),
      description: T(
        '돔 안에는 물과 음식이 넘치지만, 돔 밖의 아이들은 깨끗한 물 한 모금을 구하기도 어려워요.',
        'Inside the dome there is plenty of water and food, but children outside can hardly find a sip of clean water.',
        '穹顶里面水和食物充足，而穹顶外的孩子们连一口干净的水都很难找到。',
        'Под куполом много воды и еды, а дети снаружи с трудом находят даже глоток чистой воды.'
      ),
      mood: 'pensive',
      color: '#ff9f00',
      dilemmas: [
        {
          id: 'd2-1',
          title: T('생명을 살리는 백신과 특허', 'Life-Saving Vaccines and Patents', '救命的疫苗与专利', 'Спасительные вакцины и патенты'),
          context: T(
            '돔 밖에 전염병이 퍼졌어요. 백신을 개발한 제약회사는 특허를 지키며 1회 접종에 수백만 원을 받고 있어요. 회사는 "특허가 없으면 다음 신약을 개발할 돈이 없다"고 말해요.',
            'A disease has spread outside the dome. The company that developed the vaccine holds the patent and charges thousands of dollars per shot. The company says, "Without patents, we won\'t have money to develop the next medicine."',
            '传染病在穹顶外蔓延。研发疫苗的制药公司坚持专利，每接种一次要收几百万韩元。公司说：“没有专利，我们就没有钱研发下一种新药。”',
            'За куполом распространилась болезнь. Компания, создавшая вакцину, держит патент и берёт за один укол огромные деньги. Компания говорит: «Без патентов у нас не будет денег на новые лекарства».'
          ),
          hint: T(
            '기업의 권리와 사람의 생명이 부딪칠 때, 둘 다 지킬 방법은 없을까요?',
            'When a company\'s rights clash with human lives, is there a way to protect both?',
            '当企业的权利与人的生命发生冲突时，有没有能同时保护两者的办法？',
            'Когда права компании сталкиваются с жизнями людей, можно ли защитить и то, и другое?'
          ),
          wizardLine: T(
            '생명 앞에서 \'내 것\'과 \'우리 것\'의 경계는 어디일까요?',
            'In the face of life, where is the line between "mine" and "ours"?',
            '在生命面前，“我的”和“我们的”界限在哪里？',
            'Где проходит граница между «моим» и «нашим», когда речь идёт о жизни?'
          ),
          choices: [
            {
              id: 'c1',
              text: T(
                '신약 개발 의욕을 지키기 위해 기업의 특허권을 그대로 보장한다.',
                'Fully protect the company\'s patent to keep the motivation for developing new medicines.',
                '为了保护研发新药的积极性，完全保障企业的专利权。',
                'Полностью сохранить патент компании, чтобы у неё оставался стимул создавать новые лекарства.'
              ),
              effects: { eco: 0, solidarity: -35, peace: -10 },
              feedbackTitle: T('치료받지 못한 사람이 늘었어요', 'More people went without treatment', '得不到治疗的人越来越多', 'Всё больше людей остались без лечения'),
              feedback: T(
                '기업은 다음 연구를 이어 갔지만, 돈이 없는 수많은 환자가 치료를 받지 못했고 병은 국경을 넘어 다시 퍼졌어요.',
                'The company continued its research, but many patients without money could not be treated, and the disease spread across borders again.',
                '企业继续进行下一项研究，但无数没钱的患者得不到治疗，疾病又越过国境再次蔓延。',
                'Компания продолжила исследования, но множество бедных больных не получили лечения, и болезнь снова перешла границы.'
              ),
            },
            {
              id: 'c2',
              text: T(
                '특허를 잠시 공공재로 풀고, 여러 나라가 비용을 나눠 백신을 무상으로 보급한다.',
                'Temporarily open the patent as a public good, and let countries share the cost to give vaccines for free.',
                '暂时将专利作为公共产品开放，由多个国家分担费用，免费提供疫苗。',
                'Временно открыть патент как общественное благо, а страны вместе оплатят бесплатную вакцинацию.'
              ),
              effects: { eco: 10, solidarity: 40, peace: 20 },
              feedbackTitle: T('모두에게 백신이 닿았어요', 'Vaccines reached everyone', '疫苗送到了每个人手中', 'Вакцина дошла до всех'),
              feedback: T(
                '각국이 개발 비용을 함께 보상하기로 하면서 백신이 공평하게 전달됐고, 병이 빠르게 잦아들었어요.',
                'Countries agreed to pay back the development costs together, vaccines were shared fairly, and the disease quickly faded.',
                '各国同意共同补偿研发费用，疫苗得以公平分配，疾病很快得到了控制。',
                'Страны договорились вместе возместить затраты на разработку, вакцину распределили честно, и болезнь быстро отступила.'
              ),
            },
          ],
        },
        {
          id: 'd2-2',
          title: T('아주 싼 옷과 아동 노동', 'Very Cheap Clothes and Child Labor', '超便宜的衣服与童工', 'Очень дешёвая одежда и детский труд'),
          context: T(
            '유행하는 옷이 아주 싼 값에 팔리고 있어요. 알고 보니 가난한 나라의 어린이들이 하루 14시간씩 위험한 염색 공장에서 일해서 만든 옷이에요.',
            'Trendy clothes are being sold at very low prices. It turns out they were made by children in poor countries working 14 hours a day in dangerous dye factories.',
            '流行的衣服正以超低价出售。原来，这些衣服是贫穷国家的孩子们每天在危险的染色工厂里工作14个小时做出来的。',
            'Модную одежду продают очень дёшево. Оказывается, её шьют дети в бедных странах, работая по 14 часов в день на опасных красильных фабриках.'
          ),
          hint: T(
            '내가 낸 옷값이 누구에게 어떻게 나뉘는지 떠올려 보세요.',
            'Think about who gets the money you pay for clothes, and how it is divided.',
            '想一想你付的衣服钱，是如何分给哪些人的。',
            'Подумай, кому и как распределяются деньги, которые ты платишь за одежду.'
          ),
          wizardLine: T(
            '값이 싸다는 것은, 누군가 그 값을 대신 치르고 있다는 뜻일지도 모릅니다.',
            'A low price may mean that someone else is paying the real cost.',
            '价格便宜，也许意味着有人在替你付出代价。',
            'Низкая цена может означать, что настоящую цену платит кто-то другой.'
          ),
          choices: [
            {
              id: 'c1',
              text: T(
                '값싼 옷을 계속 살 수 있도록 지금의 생산 방식을 그대로 둔다.',
                'Leave the current way of production as it is, so cheap clothes can still be bought.',
                '维持现有的生产方式，以便继续买到便宜的衣服。',
                'Оставить всё как есть, чтобы и дальше покупать дешёвую одежду.'
              ),
              effects: { eco: -10, solidarity: -30, peace: -15 },
              feedbackTitle: T('가난이 대물림됐어요', 'Poverty was passed down', '贫困代代相传', 'Бедность передаётся по наследству'),
              feedback: T(
                '옷값은 쌌지만, 아이들은 학교 대신 공장에 머물렀고 가난에서 벗어날 기회를 잃었어요.',
                'Clothes stayed cheap, but children stayed in factories instead of school and lost their chance to escape poverty.',
                '衣服虽然便宜，但孩子们留在工厂而不是学校，失去了摆脱贫困的机会。',
                'Одежда осталась дешёвой, но дети остались на фабриках, а не в школе, и потеряли шанс выбраться из бедности.'
              ),
            },
            {
              id: 'c2',
              text: T(
                '아동 노동으로 만든 제품을 거부하고, 정당한 임금을 보장하는 공정무역 제품을 산다.',
                'Refuse products made with child labor and buy fair-trade products that guarantee fair wages.',
                '拒绝使用童工生产的产品，购买保障合理工资的公平贸易产品。',
                'Отказаться от товаров, сделанных детским трудом, и покупать товары справедливой торговли с честной оплатой труда.'
              ),
              effects: { eco: 15, solidarity: 35, peace: 20 },
              feedbackTitle: T('아이들이 학교로 돌아갔어요', 'The children went back to school', '孩子们回到了学校', 'Дети вернулись в школу'),
              feedback: T(
                '옷값은 조금 올랐지만, 부모들이 정당한 임금을 받으면서 아이들이 공장 대신 교실로 돌아갔어요.',
                'Clothes cost a little more, but as parents received fair wages, children returned to classrooms instead of factories.',
                '衣服价格稍微上涨了，但父母们拿到了合理的工资，孩子们离开工厂回到了教室。',
                'Одежда немного подорожала, но родители стали получать честную зарплату, и дети вернулись из цехов в классы.'
              ),
            },
          ],
        },
      ],
      reflection: {
        title: T('나눔과 연대를 위한 나의 약속', 'My Promise for Sharing and Solidarity', '我为分享与团结许下的承诺', 'Моё обещание ради солидарности'),
        guide: T(
          '지구 반대편의 빈곤과 불평등을 줄이기 위해, 세계시민으로서 내가 할 수 있는 일은 무엇인가요?',
          'As a world citizen, what can you do to reduce poverty and inequality on the other side of the world?',
          '作为一名世界公民，为了减少地球另一端的贫困与不平等，你能做些什么？',
          'Что ты, как гражданин мира, можешь сделать, чтобы уменьшить бедность и неравенство на другом конце света?'
        ),
        placeholder: T(
          '예) 물건을 살 때 공정무역 마크를 확인하고, 작은 나눔 활동에 참여할게요.',
          'e.g. I will check for the fair-trade mark when I shop and take part in small sharing activities.',
          '例：买东西时我会确认公平贸易标志，并参加小小的分享活动。',
          'Например: я буду искать знак справедливой торговли при покупках и участвовать в благотворительности.'
        ),
      },
    },
    {
      id: 's3',
      title: T('전쟁과 난민', 'War and Refugees', '战争与难民', 'Война и беженцы'),
      year: T('2068년 겨울', 'Winter 2068', '2068年冬天', 'Зима 2068 года'),
      place: T('눈보라가 몰아치는 국경 검문소', 'A border checkpoint in a snowstorm', '暴风雪中的边境检查站', 'Пограничный пункт в метель'),
      description: T(
        '기후 재난과 전쟁으로 집을 잃은 수십만 가족이 영하 15도의 눈보라 속에서 닫힌 국경 앞에 서 있어요.',
        'Hundreds of thousands of families who lost their homes to climate disasters and war stand before a closed border in a snowstorm at minus 15°C.',
        '因气候灾难和战争失去家园的几十万个家庭，在零下15度的暴风雪中站在关闭的国境前。',
        'Сотни тысяч семей, потерявших дома из-за климатических катастроф и войны, стоят у закрытой границы в метель при минус 15 градусах.'
      ),
      mood: 'tense',
      color: '#3182f6',
      dilemmas: [
        {
          id: 'd3-1',
          title: T('국경 앞의 난민', 'Refugees at the Border', '边境前的难民', 'Беженцы у границы'),
          context: T(
            '전쟁을 피해 온 아이들과 가족들이 국경을 열어 달라고 호소하고 있어요. 일부 시민들은 치안과 세금 부담을 걱정하며 국경을 닫자고 해요.',
            'Children and families fleeing the war are begging for the border to open. Some citizens are worried about safety and taxes and want to keep the border closed.',
            '躲避战争的孩子和家庭正在恳求开放国境。一些市民担心治安和税收负担，主张关闭国境。',
            'Дети и семьи, бежавшие от войны, просят открыть границу. Часть жителей боится за безопасность и налоги и хочет держать границу закрытой.'
          ),
          hint: T(
            '내가 저 국경 앞에 서 있다면 어떤 마음일까요? 시민들의 걱정은 어떻게 덜어 줄 수 있을까요?',
            'How would you feel if you were standing at that border? How could the citizens\' worries be eased?',
            '如果你站在那个国境前，会是什么心情？市民们的担忧又该如何化解？',
            'Что бы ты чувствовал, стоя у этой границы? Как можно уменьшить тревоги жителей?'
          ),
          wizardLine: T(
            '오늘 문을 두드리는 사람이, 언젠가의 우리일 수도 있습니다.',
            'The people knocking on the door today could be us someday.',
            '今天敲门的人，也许就是将来某一天的我们。',
            'Те, кто стучится в дверь сегодня, однажды могут оказаться нами.'
          ),
          choices: [
            {
              id: 'c1',
              text: T(
                '자국민의 안전과 부담을 이유로 국경을 닫고 진입을 막는다.',
                'Close the border and block entry for the safety and burden of our own citizens.',
                '以本国国民的安全和负担为由，关闭国境，阻止进入。',
                'Закрыть границу и не пускать людей ради безопасности и благополучия своих граждан.'
              ),
              effects: { eco: 0, solidarity: -25, peace: -40 },
              feedbackTitle: T('국경에 갈등이 깊어졌어요', 'Conflict deepened at the border', '边境的矛盾加深了', 'Конфликт на границе усилился'),
              feedback: T(
                '국경 안은 조용했지만, 장벽 밖에서 많은 사람이 추위와 병으로 쓰러졌고 나라 사이의 불신이 커졌어요.',
                'It was quiet inside the border, but many people outside the wall collapsed from cold and illness, and distrust between countries grew.',
                '国境内很平静，但墙外许多人因寒冷和疾病倒下，国家之间的不信任也加深了。',
                'Внутри страны было спокойно, но за стеной многие люди погибали от холода и болезней, а недоверие между странами росло.'
              ),
            },
            {
              id: 'c2',
              text: T(
                '임시 보호소를 세우고, 국제기구와 함께 식사·의료·교육을 제공한다.',
                'Set up temporary shelters and provide food, medical care, and education together with international organizations.',
                '建立临时避难所，与国际组织一起提供饮食、医疗和教育。',
                'Открыть временные приюты и вместе с международными организациями обеспечить еду, медицинскую помощь и обучение.'
              ),
              effects: { eco: 10, solidarity: 35, peace: 40 },
              feedbackTitle: T('함께 사는 법을 배웠어요', 'We learned to live together', '我们学会了共同生活', 'Мы научились жить вместе'),
              feedback: T(
                '처음엔 걱정도 많았지만, 국제기구와 비용을 나누고 서로를 알아 가면서 난민과 시민이 함께 사는 공동체가 생겼어요.',
                'There were many worries at first, but by sharing costs with international organizations and getting to know each other, refugees and citizens built a community together.',
                '起初有很多担忧，但通过与国际组织分担费用、彼此逐渐了解，难民和市民共同生活的社区诞生了。',
                'Сначала было много тревог, но, разделив расходы с международными организациями и узнав друг друга, беженцы и жители создали общее сообщество.'
              ),
            },
          ],
        },
        {
          id: 'd3-2',
          title: T('무기를 늘릴까, 평화를 협상할까', 'More Weapons or Peace Talks?', '增加武器，还是谈判和平？', 'Больше оружия или мирные переговоры?'),
          context: T(
            '이웃 나라와의 긴장이 높아졌어요. 국방 예산을 세 배로 늘려 미사일을 배치하자는 의견과, 평화 협상을 하고 예산 일부를 재건 기금으로 쓰자는 의견이 맞서고 있어요.',
            'Tension with a neighboring country has risen. Some want to triple the defense budget and deploy missiles; others want peace talks and to use part of the budget for a rebuilding fund.',
            '与邻国的紧张局势加剧了。一方主张把国防预算增加到三倍并部署导弹，另一方主张进行和平谈判，把部分预算用作重建基金。',
            'Напряжённость с соседней страной выросла. Одни хотят утроить военный бюджет и разместить ракеты, другие — начать мирные переговоры и направить часть бюджета в фонд восстановления.'
          ),
          hint: T(
            '안전을 지키는 방법이 힘뿐일까요? 상대도 나와 똑같이 생각한다면 어떻게 될까요?',
            'Is strength the only way to stay safe? What happens if the other side thinks exactly like you?',
            '保护安全的方法只有武力吗？如果对方也和你想的一样，会发生什么？',
            'Разве сила — единственный способ быть в безопасности? Что будет, если другая сторона думает точно так же?'
          ),
          wizardLine: T(
            '마지막 선택입니다. 그대의 결정이 미래의 모습을 완성합니다.',
            'This is the final choice. Your decision completes the shape of the future.',
            '这是最后的选择。你的决定将完成未来的模样。',
            'Это последний выбор. Твоё решение завершит картину будущего.'
          ),
          choices: [
            {
              id: 'c1',
              text: T(
                '힘의 우위를 지키기 위해 국방 예산을 크게 늘려 무기를 배치한다.',
                'Greatly increase the defense budget and deploy weapons to stay stronger.',
                '为了保持力量优势，大幅增加国防预算并部署武器。',
                'Сильно увеличить военный бюджет и разместить оружие, чтобы сохранить превосходство в силе.'
              ),
              effects: { eco: -15, solidarity: -20, peace: -35 },
              feedbackTitle: T('긴장이 더 높아졌어요', 'Tension rose even higher', '紧张局势进一步升级', 'Напряжение стало ещё сильнее'),
              feedback: T(
                '이웃 나라도 무기를 늘리며 군비 경쟁이 시작됐고, 작은 오해가 국경 충돌로 번졌어요.',
                'The neighbor also built up weapons, an arms race began, and a small misunderstanding turned into a border clash.',
                '邻国也增加了武器，军备竞赛开始了，一个小误会演变成了边境冲突。',
                'Сосед тоже стал вооружаться, началась гонка вооружений, и маленькое недоразумение переросло в столкновение на границе.'
              ),
            },
            {
              id: 'c2',
              text: T(
                '유엔·이웃 나라와 평화 협정을 맺고, 국방 예산 일부를 재건 기금으로 돌린다.',
                'Sign a peace agreement with the UN and the neighbor, and move part of the defense budget to a rebuilding fund.',
                '与联合国和邻国签订和平协议，把部分国防预算转为重建基金。',
                'Заключить мирное соглашение с ООН и соседями и направить часть военного бюджета в фонд восстановления.'
              ),
              effects: { eco: 15, solidarity: 25, peace: 40 },
              feedbackTitle: T('총성이 멈췄어요', 'The gunfire stopped', '枪声停止了', 'Выстрелы стихли'),
              feedback: T(
                '협상은 오래 걸렸지만, 서로 무기를 줄이기로 약속하면서 국경에 평화 공원이 들어섰어요.',
                'The talks took a long time, but both sides promised to reduce weapons, and a peace park was built at the border.',
                '谈判花了很长时间，但双方承诺减少武器，边境上建起了和平公园。',
                'Переговоры шли долго, но стороны договорились сократить оружие, и на границе появился парк мира.'
              ),
            },
          ],
        },
      ],
      reflection: {
        title: T('평화와 공존을 위한 나의 약속', 'My Promise for Peace and Living Together', '我为和平与共存许下的承诺', 'Моё обещание ради мира'),
        guide: T(
          '나와 다른 배경이나 국적을 가진 사람들을 대할 때, 어떤 마음과 행동이 가장 중요할까요?',
          'When you meet people with backgrounds or nationalities different from yours, what attitude and actions matter most?',
          '在面对与自己背景或国籍不同的人时，什么样的心态和行动最重要？',
          'Какое отношение и какие поступки важнее всего, когда общаешься с людьми другого происхождения или национальности?'
        ),
        placeholder: T(
          '예) 편견 대신 다름을 존중하고, 갈등이 생기면 대화로 풀어 볼게요.',
          'e.g. I will respect differences instead of judging, and solve conflicts by talking.',
          '例：我会尊重差异而不是抱有偏见，有矛盾时通过对话来解决。',
          'Например: я буду уважать различия вместо предрассудков и решать конфликты разговором.'
        ),
      },
    },
  ],
};
