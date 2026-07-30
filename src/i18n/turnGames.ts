import type { AppLanguage } from '@/store/settingsStore';
import type { TurnGameMode } from '@/types/turnGame';

export interface TurnHelpCopy {
  goal: string;
  turn: string;
  win: string;
  difficulty: string;
  tip: string;
}

export interface TurnModeCopy {
  title: string;
  description: string;
  winReason: string;
  help: TurnHelpCopy;
}

const EN_MODES: Record<TurnGameMode, TurnModeCopy> = {
  rune_grid: {
    title: 'Rune Duel',
    description: 'Complete a line of your color before your opponent.',
    winReason: 'Completed the winning line',
    help: {
      goal: 'Create an unbroken line with your own marks.',
      turn: 'On your turn, tap one empty cell. Horizontal, vertical and diagonal lines count.',
      win: 'The first player to complete the required line length wins the round.',
      difficulty: 'Higher difficulty expands the board and increases the required line length.',
      tip: 'Build your line while blocking any cell that would let your opponent win next turn.',
    },
  },
  connect_four: {
    title: 'Four in Line',
    description: 'Drop your pieces and build the first unbroken line.',
    winReason: 'Built the first unbroken line',
    help: {
      goal: 'Connect your pieces in one unbroken line.',
      turn: 'Tap a column to drop your piece into its lowest empty space.',
      win: 'The player who connects the required number horizontally, vertically or diagonally wins.',
      difficulty: 'Higher difficulty adds rows and columns and may require a longer line.',
      tip: 'Try to build open-ended lines that can be completed from two directions.',
    },
  },
  memory_pairs: {
    title: 'Memory Pairs',
    description: 'Match identical symbols; every pair you find takes your color.',
    winReason: 'Found the most matching pairs',
    help: {
      goal: 'Match identical symbols hidden under the cards.',
      turn: 'Reveal two cards. A match becomes your color and lets you play again; a mismatch closes.',
      win: 'When every card is open, the player with the most pairs wins.',
      difficulty: 'Higher difficulty adds more cards and more symbols to remember.',
      tip: 'Remember the cards your opponent reveals too; all revealed information is shared.',
    },
  },
  pipe_circuit: {
    title: 'Circuit Rotation',
    description: 'Rotate every piece to its target orientation and complete the circuit.',
    winReason: 'Rotated the final circuit piece into place',
    help: {
      goal: 'Match every circuit piece to the target orientation shown in its corner.',
      turn: 'Tap a piece to rotate it clockwise. A correctly oriented piece locks in place.',
      win: 'The player who fixes the final incorrect piece wins the round.',
      difficulty: 'Larger boards increase the number of pieces to nearly thirty.',
      tip: 'The small shape in the corner is the target; the large center shape is the current direction.',
    },
  },
  resonance_dials: {
    title: 'Resonance Lock',
    description: 'Tune every channel to its target frequency and unlock the system.',
    winReason: 'Locked the final frequency onto its target',
    help: {
      goal: 'Tune every channel to the target frequency shown above it.',
      turn: 'Use minus or plus to change one frequency step. A matching channel locks.',
      win: 'The player who tunes the final frequency correctly wins.',
      difficulty: 'Higher difficulty increases the simultaneous channels from three to six.',
      tip: 'Choose the shortest direction between the current and target values; frequencies wrap around.',
    },
  },
  cipher_clash: {
    title: 'Cipher Clash',
    description: 'Decode your secret rune sequence before your opponent.',
    winReason: 'Decoded the complete secret rune sequence',
    help: {
      goal: 'Decode your private rune sequence before your opponent.',
      turn: 'Choose colors and submit a guess. “Exact” means correct rune and position; “Near” means correct rune in the wrong position.',
      win: 'The first player to match every position wins the round.',
      difficulty: 'Higher difficulty expands the sequence and rune pool; hard mode allows repeated runes.',
      tip: 'Remove colors that receive no feedback from your following guesses.',
    },
  },
  circuit_claim: {
    title: 'Circuit Claim',
    description: 'Complete lines and claim energy cells.',
    winReason: 'Claimed the most energy cells',
    help: {
      goal: 'Draw lines between energy nodes to claim cells in your color.',
      turn: 'Tap an empty edge. Closing a cell’s fourth edge claims it and gives you another turn.',
      win: 'When all edges are complete, the player with the most cells wins.',
      difficulty: 'Higher difficulty grows the board from six to thirty cells and creates longer chains.',
      tip: 'Do not leave a three-sided cell to your opponent; it can start a long scoring chain.',
    },
  },
  neon_trail: {
    title: 'Neon Trail',
    description: 'Protect your space and leave your opponent with no move.',
    winReason: 'Blocked every escape route for the opponent',
    help: {
      goal: 'Preserve your movement space while blocking every exit for your opponent.',
      turn: 'Move to an empty orthogonal neighbor. Your previous cell becomes a permanent neon trail.',
      win: 'A player with no empty neighboring cell on their turn loses the round.',
      difficulty: 'Higher difficulty expands the board and requires longer-term space planning.',
      tip: 'Count the exits you can reach two moves ahead, not only the empty cell in front of you.',
    },
  },
  gateway_race: {
    title: 'Gateway Race',
    description: 'Reach the opposite gate or slow your opponent with barriers.',
    winReason: 'Reached the opposite energy gate first',
    help: {
      goal: 'Reach the opposite energy gate from your colored starting edge.',
      turn: 'Move to a neighboring cell or place a barrier. Barriers can never block every possible path.',
      win: 'The first player to reach the opposite gate row wins.',
      difficulty: 'Higher difficulty expands the board and adds more available barriers.',
      tip: 'Use barriers to redirect your opponent away from your route, not only to slow them down.',
    },
  },
  polarity_war: {
    title: 'Polarity War',
    description: 'Enclose opposing orbs and convert them to your polarity.',
    winReason: 'Converted the most orbs to their polarity',
    help: {
      goal: 'Enclose opposing orbs from two sides to convert them to your color.',
      turn: 'Play only on a glowing cell that flips at least one opponent orb. Every enclosed orb changes polarity.',
      win: 'When neither player has a valid move, the player with the most orbs wins.',
      difficulty: 'Higher difficulty expands the board from 4×4 to 8×8 and makes edge control more important.',
      tip: 'Corners cannot be flipped. Take them when possible and avoid giving one away.',
    },
  },
};

const TR_MODES: Record<TurnGameMode, TurnModeCopy> = {
  rune_grid: {
    title: 'Rün Düellosu',
    description: 'Aynı renkten bir çizgiyi rakibinden önce tamamla.',
    winReason: 'Kazandıran çizgiyi tamamladı',
    help: {
      goal: 'Kendi işaretlerinden kesintisiz bir çizgi oluştur.',
      turn: 'Sıran geldiğinde boş karelerden yalnızca birine dokun. Yatay, dikey ve çapraz çizgiler geçerlidir.',
      win: 'Ekranda belirtilen uzunluktaki çizgiyi rakibinden önce tamamlayan turu kazanır.',
      difficulty: 'Zorluk yükseldikçe tahta büyür ve tamamlaman gereken çizgi uzar.',
      tip: 'Kendi çizgini büyütürken rakibin bir sonraki hamlede kazanabileceği kareyi kapat.',
    },
  },
  connect_four: {
    title: 'Dört Hat',
    description: 'Taşlarını düşür ve kesintisiz hattı ilk sen kur.',
    winReason: 'Kesintisiz hattı ilk kuran oldu',
    help: {
      goal: 'Taşlarını aynı doğrultuda kesintisiz bir hatta birleştir.',
      turn: 'Bir sütuna dokunduğunda taşın o sütundaki en alttaki boş yere düşer.',
      win: 'Gerekli sayıda taşı yatay, dikey veya çapraz bağlayan oyuncu turu kazanır.',
      difficulty: 'Zorluk arttığında sütun ve satır sayısı büyür; zor seviyede daha uzun hat gerekir.',
      tip: 'İki farklı yönden tamamlanabilecek açık uçlu hatlar kurmaya çalış.',
    },
  },
  memory_pairs: {
    title: 'Hafıza Eşleri',
    description: 'Aynı sembolleri eşleştir; bulduğun çiftler senin rengin olur.',
    winReason: 'En fazla sembol çiftini buldu',
    help: {
      goal: 'Kapalı kartların altındaki aynı sembolleri eşleştir.',
      turn: 'Sıranda iki kart aç. Semboller aynıysa çift senin rengin olur ve tekrar oynarsın; değilse kartlar kapanır.',
      win: 'Bütün kartlar açıldığında en fazla çifti bulan oyuncu turu kazanır.',
      difficulty: 'Zorluk yükseldikçe kart sayısı ve hatırlaman gereken sembol çeşitliliği artar.',
      tip: 'Rakibin açtığı kartların konumlarını da takip et; bilgi iki oyuncu için ortaktır.',
    },
  },
  pipe_circuit: {
    title: 'Devre Döndürme',
    description: 'Parçaları hedef yönlere çevirip devreyi ilk sen tamamla.',
    winReason: 'Son devre parçasını doğru yöne çevirdi',
    help: {
      goal: 'Bütün devre parçalarını köşede gösterilen hedef yönlerine getir.',
      turn: 'Bir parçaya dokunarak onu saat yönünde çevir. Doğru yöne gelen parça kilitlenir.',
      win: 'Son yanlış parçayı hedef yönüne çeviren oyuncu turu kazanır.',
      difficulty: 'Tahta büyüdükçe düzeltilmesi gereken parça sayısı yaklaşık 30 kareye kadar çıkar.',
      tip: 'Parçanın sol üstündeki küçük şekil hedefi, ortadaki büyük şekil mevcut yönü gösterir.',
    },
  },
  resonance_dials: {
    title: 'Rezonans Kilidi',
    description: 'Kanalları hedef frekanslara getirip kilidi çöz.',
    winReason: 'Son frekansı hedefe kilitledi',
    help: {
      goal: 'Her kanalı üstteki hedef frekansına ayarla.',
      turn: 'Kanalın yanındaki eksi veya artı düğmesiyle frekansı bir kademe değiştir. Eşleşen kanal kilitlenir.',
      win: 'Son frekansı doğru değere getiren oyuncu turu kazanır.',
      difficulty: 'Zorluk arttıkça aynı anda yönetilen kanal sayısı üçten altıya çıkar.',
      tip: 'Mevcut değer ile hedef arasındaki en kısa yönü seç; frekanslar döngüsel ilerler.',
    },
  },
  cipher_clash: {
    title: 'Şifre Çatışması',
    description: 'Kendi gizli rün dizini rakibinden önce çöz.',
    winReason: 'Gizli rün dizisinin tamamını çözdü',
    help: {
      goal: 'Sana özel gizli rün dizisini rakibinden önce çöz.',
      turn: 'Alttaki renklerden seçim yapıp tahminini gönder. “Tam” doğru rün ve yeri, “Yer” doğru rün fakat yanlış yeri gösterir.',
      win: 'Dizideki bütün konumları tam eşleştiren ilk oyuncu turu kazanır.',
      difficulty: 'Zorluk arttığında dizi ve rün havuzu büyür; zor seviyede aynı rün birden fazla kullanılabilir.',
      tip: 'Sıfır geri bildirim aldığın renkleri sonraki tahminlerinden çıkar.',
    },
  },
  circuit_claim: {
    title: 'Devre Alanı',
    description: 'Hatları tamamla, enerji hücrelerini ele geçir.',
    winReason: 'En fazla enerji hücresini ele geçirdi',
    help: {
      goal: 'Enerji düğümleri arasına hat çekerek hücreleri kendi renginle kapat.',
      turn: 'Boş bir hatta dokun. Bir hücrenin dördüncü kenarını kapatırsan hücreyi alır ve tekrar oynarsın.',
      win: 'Bütün hatlar tamamlandığında en fazla enerji hücresine sahip oyuncu turu kazanır.',
      difficulty: 'Zorluk yükseldikçe hücre sayısı 6’dan 30’a kadar büyür ve uzun zincirler oluşur.',
      tip: 'Üç kenarı kapanmış hücreyi rakibe bırakma; tek hamlede uzun bir alan zinciri kazanabilir.',
    },
  },
  neon_trail: {
    title: 'Neon İz',
    description: 'İz bırak, alanını koru ve rakibini hareketsiz bırak.',
    winReason: 'Rakibinin bütün kaçış yollarını kapattı',
    help: {
      goal: 'Hareket alanını korurken rakibinin bütün çıkışlarını kapat.',
      turn: 'Kürenin yanındaki boş karelerden birine ilerle. Geçtiğin kare neon izin olur ve tekrar kullanılamaz.',
      win: 'Sırası geldiğinde boş komşu karesi kalmayan oyuncu turu kaybeder.',
      difficulty: 'Zorluk yükseldikçe tahta büyür ve daha uzun süreli alan planlaması gerekir.',
      tip: 'Sadece önündeki boşluğa değil, iki hamle sonra ulaşabileceğin çıkış sayısına da bak.',
    },
  },
  gateway_race: {
    title: 'Geçit Savaşı',
    description: 'Kapıya ulaş veya enerji bariyerleriyle rakibini yavaşlat.',
    winReason: 'Karşı enerji kapısına ilk ulaşan oldu',
    help: {
      goal: 'Kendi rengindeki başlangıç kenarından karşı enerji kapısına ulaş.',
      turn: 'Komşu kareye ilerle veya rakibin yoluna bariyer koy. Hiçbir bariyer bütün yolları kapatamaz.',
      win: 'Karşı kenardaki kapı satırına ilk ulaşan oyuncu turu kazanır.',
      difficulty: 'Zorluk yükseldikçe tahta büyür ve kullanılabilecek bariyer sayısı artar.',
      tip: 'Bariyeri yalnızca rakibi yavaşlatmak için değil, onu senin yolundan uzaklaştırmak için kullan.',
    },
  },
  polarity_war: {
    title: 'Polarite Savaşı',
    description: 'Rakip küreleri kuşatıp kendi polaritene dönüştür.',
    winReason: 'En fazla küreyi kendi polaritesine çevirdi',
    help: {
      goal: 'Rakip kürelerini iki taraftan kuşatıp kendi rengine dönüştür.',
      turn: 'Yalnızca rakip küre çevirebilen parlak kareye oynayabilirsin. Arada kalan küreler senin polaritene geçer.',
      win: 'İki oyuncunun da geçerli hamlesi kalmadığında en fazla küreye sahip olan turu kazanır.',
      difficulty: 'Zorluk arttıkça tahta 4×4’ten 8×8’e büyür ve kenar kontrolü önem kazanır.',
      tip: 'Köşeler çevrilemez; mümkün olduğunda köşeyi al, rakibine kolayca köşe verme.',
    },
  },
};

export const TURN_UI = {
  en: {
    howToPlay: 'HOW TO PLAY', closeHowTo: 'Close how-to-play window',
    diagramCaption: 'Arrows show how one move affects the board.',
    goal: 'GOAL', yourTurn: 'WHAT TO DO ON YOUR TURN', win: 'HOW TO WIN',
    difficulty: 'HOW DIFFICULTY CHANGES', tip: 'TIP', understood: 'Got it',
    backToGame: 'GOT IT, BACK TO GAME', current: 'CURRENT', target: 'TARGET',
    exact: 'EXACT', near: 'NEAR', area: 'AREA', pairs: 'PAIRS',
    round: 'ROUND', points: 'POINTS', turnStatus: 'TURN', waiting: 'WAITING',
    noRoundPoints: 'Neither player scored', chat: 'Chat', game: 'Game', reaction: 'Reaction',
    chatEmpty: 'No messages yet.', chatPlaceholder: 'Write a short message…',
    soloHeader: 'SINGLE PLAYER · DUELBOT', sharedHeader: 'SHARED TABLE',
    loading: 'Preparing the shared table…', player: 'Player', leaveGame: 'Leave game',
    rotateHint: 'Rotate clockwise', submitGuess: 'SUBMIT GUESS', deleteRune: 'Delete last rune',
    cipherEmpty: 'Start scanning the secret sequence with your first guess.',
    move: 'MOVE', barrier: 'BARRIER', chooseMove: 'Select movement mode',
    chooseBarrier: 'Select barrier mode', roundScore: 'ROUND SCORE',
    roundYouWon: 'YOU WON THE ROUND!', roundDraw: 'ROUND DRAW',
    roundWinner: (name: string) => `${name.toUpperCase()} WON THE ROUND`,
    howToFor: (name: string) => `How to play ${name}`,
    cell: (number: number) => `Cell ${number}`, column: (number: number) => `Column ${number}`,
    pipePiece: (number: number, rotation: number) => `Circuit piece ${number}, direction ${rotation}`,
    channelDecrease: (channel: string) => `Decrease channel ${channel}`,
    channelIncrease: (channel: string) => `Increase channel ${channel}`,
    rune: (number: number) => `Rune ${number}`, circuitEdge: (number: number) => `Circuit edge ${number}`,
    neonCell: (number: number) => `Neon cell ${number}`, gatewayCell: (number: number) => `Gateway cell ${number}`,
    polarityCell: (number: number) => `Polarity cell ${number}`,
    fullMatches: 'EXACT MATCHES',
    card: (number: number) => ['Card', number].join(' '),
    targetFrequencies: 'TARGET FREQUENCIES',
  },
  tr: {
    howToPlay: 'NASIL OYNANIR?', closeHowTo: 'Nasıl oynanır penceresini kapat',
    diagramCaption: 'Oklar, bir hamlenin tahtadaki etkisini gösterir.',
    goal: 'AMAÇ', yourTurn: 'SIRANDA NE YAPACAKSIN?', win: 'NASIL KAZANIRSIN?',
    difficulty: 'ZORLUK NASIL DEĞİŞİR?', tip: 'İPUCU', understood: 'Anladım',
    backToGame: 'ANLADIM, OYUNA DÖN', current: 'MEVCUT', target: 'HEDEF',
    exact: 'TAM', near: 'YER', area: 'ALAN', pairs: 'EŞLER',
    round: 'TUR', points: 'PUAN', turnStatus: 'SIRASI', waiting: 'BEKLİYOR',
    noRoundPoints: 'İki taraf da puan alamadı', chat: 'Sohbet', game: 'Oyun', reaction: 'Tepki',
    chatEmpty: 'Henüz mesaj yok.', chatPlaceholder: 'Kısa bir mesaj yaz…',
    soloHeader: 'TEK OYUNCULU · DUELBOT', sharedHeader: 'ORTAK MASA',
    loading: 'Ortak masa hazırlanıyor…', player: 'Oyuncu', leaveGame: 'Oyundan çık',
    rotateHint: 'Saat yönünde döndür', submitGuess: 'TAHMİNİ GÖNDER', deleteRune: 'Son rünü sil',
    cipherEmpty: 'Gizli diziyi ilk tahmininle taramaya başla.',
    move: 'İLERLE', barrier: 'BARİYER', chooseMove: 'İlerleme modunu seç',
    chooseBarrier: 'Bariyer modunu seç', roundScore: 'TUR PUANI',
    roundYouWon: 'TURU KAZANDIN!', roundDraw: 'TUR BERABERE',
    roundWinner: (name: string) => `${name.toUpperCase()} TURU KAZANDI`,
    howToFor: (name: string) => `${name} nasıl oynanır?`,
    cell: (number: number) => `Hücre ${number}`, column: (number: number) => `Sütun ${number}`,
    pipePiece: (number: number, rotation: number) => `Devre parçası ${number}, yön ${rotation}`,
    channelDecrease: (channel: string) => `${channel} kanalını azalt`,
    channelIncrease: (channel: string) => `${channel} kanalını artır`,
    rune: (number: number) => `Rün ${number}`, circuitEdge: (number: number) => `Devre hattı ${number}`,
    neonCell: (number: number) => `Neon hücresi ${number}`, gatewayCell: (number: number) => `Geçit hücresi ${number}`,
    polarityCell: (number: number) => `Polarite hücresi ${number}`,
    fullMatches: 'TAM EŞLEŞME',
    card: (number: number) => ['Kart', number].join(' '),
    targetFrequencies: 'HEDEF FREKANSLAR',
  },
} as const;

export const TURN_RESULTS = {
  en: {
    loading: 'Preparing results…',
    leftTitle: 'You left the match',
    interruptedTitle: 'Match interrupted',
    wonTitle: 'You won!',
    winnerTitle: (name: string) => `${name} won`,
    drawTitle: 'Draw!',
    botWon: 'DuelBot won the match. Change the rules and try again.',
    opponentWon: 'Your opponent won. Match again to play another round.',
    playerLeft: (name: string) => `${name} left the match.`,
    soloComplete: (rounds: number) => `${rounds}-round DuelBot match completed`,
    sharedComplete: (rounds: number) => `${rounds}-round shared table completed`,
    waiting: 'Waiting for opponent…',
    playAgain: 'Play again',
    home: 'Main menu',
  },
  tr: {
    loading: 'Sonuç hazırlanıyor…',
    leftTitle: 'Maçtan çıktın',
    interruptedTitle: 'Maç yarıda kaldı',
    wonTitle: 'Kazandın!',
    winnerTitle: (name: string) => `${name} kazandı`,
    drawTitle: 'Berabere!',
    botWon: 'DuelBot maçı kazandı. Kuralları değiştirip yeniden deneyebilirsin.',
    opponentWon: 'Rakibin maçı kazandı. Yeniden oynamak için tekrar eşleşebilirsiniz.',
    playerLeft: (name: string) => `${name} maçtan ayrıldı.`,
    soloComplete: (rounds: number) => `${rounds} turluk DuelBot maçı tamamlandı`,
    sharedComplete: (rounds: number) => `${rounds} turluk ortak masa tamamlandı`,
    waiting: 'Rakip bekleniyor…',
    playAgain: 'Tekrar oyna',
    home: 'Ana menü',
  },
} as const;

export const TURN_DURATION = {
  en: {
    minutes: 'MINUTES', playerTime: 'Player time',
    value: (minutes: number) => `${minutes} minutes`,
    increase: 'Increase time', decrease: 'Decrease time',
    short: (minutes: number) => `${minutes} min`,
  },
  tr: {
    minutes: 'DAKİKA', playerTime: 'Oyuncu süresi',
    value: (minutes: number) => `${minutes} dakika`,
    increase: 'Süreyi artır', decrease: 'Süreyi azalt',
    short: (minutes: number) => `${minutes} dk`,
  },
} as const;

export const TURN_LOBBY = {
  en: { playerOne: 'Player 1', playerTwo: 'Player 2' },
  tr: { playerOne: 'Oyuncu 1', playerTwo: 'Oyuncu 2' },
} as const;

export function getTurnModeCopy(language: AppLanguage, mode: TurnGameMode): TurnModeCopy {
  return (language === 'en' ? EN_MODES : TR_MODES)[mode];
}
