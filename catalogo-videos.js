/* ======================================================
   CATÁLOGO DE VÍDEOS — fonte única, usada por membros.html (exibe)
   e painel.html (edita). Cada vídeo tem: id (YouTube), titulo,
   idioma e fase (1 ou 2).

   Persistência: localStorage, chave abaixo. O painel salva a lista
   já achatada (array); se não houver nada salvo ainda, cai no
   catálogo padrão logo abaixo (convertido de idioma → array plano).
====================================================== */
const CHAVE_CATALOGO_VIDEOS = 'dqe_video_catalog_idiomas';

const VIDEO_CATALOG_PADRAO = {
  ingles: [
    { id: "UA_8eK4RJkA", titulo: "LEARN TO COUNT! 🔢 | Fun Numbers Songs Compilation | Lingokids Songs" },
    { id: "9mTeC8N8PH0", titulo: "Let\'s Play MATHSKETBALL🏀🙌 Sports for Kids | Summer Games in Lingokids" },
    { id: "n0euSJs26-s", titulo: "NUMBERS SONGS FOR KIDS 🔢🎶 Kids Songs and Nursery Rhymes | Lingokids" },
    { id: "t5bwjs1OED8", titulo: "COUNTING SONG 🧮💙 + The Best Numbers Songs for Kids | Lingokids" },
    { id: "5EWozQQoQkE", titulo: "Just DANCE! 🪩 💃 Skip Counting Dance for Kids | Math Songs | Lingokids" },
    { id: "9ahX0cMb5yA", titulo: "Help Elliot Build a Castle! 🏰 | Numbers Songs Collection | Lingokids" },
    { id: "kkHpFFuz4cQ", titulo: "Counting down from 20 Song 🔢 + More Math Songs for kids ✨| Lingokids" },
    { id: "567vQd8qeE4", titulo: "Math Songs for Kids 2️⃣🕺Learn to Add Doubles | Math Songs by Lingokids" },
    { id: "HyrX0gIXWVE", titulo: "Colors, Numbers and Shapes compilation🕺🎶 | MUSIC FOR KIDS | Lingokids" },
    { id: "OzAWcJ3nkyM", titulo: "MATH FOR KIDS with CARTOONS 🧮 Lingokids" },
    { id: "XrwLlzDzgjM", titulo: "FUN WITH MATH 🤖 + More Cartoons for kids | Lingokids" },
    { id: "CIwNbt-nsEk", titulo: "FUN WITH MATH 👒 Order by Size for kids | Lingokids Cartoons for kids" },
    { id: "EfK52STNIFs", titulo: "FUN WITH MATH 🎈📏 Sizes for kids | Cartoons for kids | Lingokids" },
    { id: "ZTE5vDoINCg", titulo: "CARTOONS FOR KIDS | Counting Numbers 🔢🎶 | Counting Song | Lingokids" },
    { id: "WZQbmcIjfss", titulo: "Learn Numbers with Lingokids 🔢🤓| VOCABULARY FOR KIDS | Lingokids" },
    { id: "JcAAAv419BI", titulo: "BEST NUMBERS SONGS FOR KIDS 🔢 🎵 + More Nursery Rhymes | Lingokids" },
    { id: "jOS2zDLOudE", titulo: "LINGOKIDS NUMBERS DANCE  🔢💃| Dance and Learn the Numbers | Lingokids" },
    { id: "5aVSjA17BJM", titulo: "NUMBERS FOR KIDS 🔢 | VOCABULARY, SONGS and GAMES in English | Lingokids" },
    { id: "NLoiZZKfkFQ", titulo: "NUMBERS SONG 🎻  Let\'s Learn to Count 1 to 10 Singing | Sing Along with Kate | Lingokids" },
    { id: "PD3mdU1e1-8", titulo: "NUMBERS SONG 🎵 Learn the Numbers in English |  Lingokids" },
    { id: "Nk0r6VomNLo", titulo: "Five Little Ducks + More Numbers and Counting Songs for Kids | Lingokids" },
    { id: "NmGc08j7_0Q", titulo: "Alice the Camel + More Music Games for Kids - Dance Songs for Kids | Lingokids" },
    { id: "VovaiHahdxI", titulo: "MISS MARY MACK + More Songs 🎒 Back to School Music for Kids | Lingokids" },
    { id: "lBlLyIzWwmw", titulo: "Three Little Kittens 🐾 Baby Nursery Rhymes + Kids Songs in English | Lingokids" },
    { id: "9vliRwCG28Q", titulo: "🐜 THE ANTS GO MARCHING 🐜 Songs for Kids in English With Lyrics  | Lingokids" },
    { id: "8aXXc_ik5mc", titulo: "Happy Birthday - Rhymes for Kids | Lingokids - School Readiness in English" },
    { id: "1Z_IIQVzTsg", titulo: "Five Little Ducks - Nursery rhymes | Lingokids - School Readiness in English" },
    { id: "peX1w2Zyx58", titulo: "Five little Fairies - Song for Children - Nursery Rhymes" },
    { id: "112vutXVFzA", titulo: "Five Green and Speckled Frogs - Kids Songs & Nursery Rhymes | Lingokids" },
    { id: "nuWm5Dukn1U", titulo: "12 Months of the Year - Song for Kids | Lingokids - School Readiness in English" },
    { id: "E5adS8pRBJY", titulo: "Little Dinosaurs - Song for Kids | Lingokids - School Readiness in English" },
    { id: "APBf4vlQkoc", titulo: "COLOR FAMILY SONG | FAMÍLIA DAS CORES |  MÚSICA EM INGLÊS | INGLÊS COM LEO E LULLY" },
    { id: "naH22qItJB0", titulo: "THE COLORS\' NAMES | O NOME DAS CORES | MÚSICA EM INGLÊS | LEO E LULLY" },
    { id: "Hg57g4uqyMs", titulo: "10 MIN DE MÚSICAS EM INGLÊS | VOL. 03 | AS CORES, OS NÚMEROS E MAIS | LEO E LULLY" },
    { id: "VwERlQ_sSck", titulo: "NUMBERS SONG | MÚSICA DOS NÚMEROS | MÚSICA EM INGLÊS | LEO E LULLY" },
    { id: "3KrjB4JLFt8", titulo: "THE ANIMAL DANCE | DANCINHA DOS ANIMAIS | MÚSICA EM INGLÊS | LEO E LULLY" },
    { id: "dBYjj4IqJmI", titulo: "FINGER FAMILY SONG | FAMÍLIA DEDO |  MÚSICA EM INGLÊS | LEO E LULLY" },
    { id: "lzR2z8UZajU", titulo: "PALAVRINHAS FÁCEIS EM INGLÊS | PALAVRAS EM INGLÊS PARA CRIANÇAS| APRENDER INGLÊS COM LEO E LULLY" },
    { id: "uGA6r-lgZWU", titulo: "ABC SONG | MÚSICA DO ABC | MÚSICA EM INGLÊS | LEO E LULLY" },
    { id: "dHZPBdsyMpE", titulo: "OLD MCDONALD | SEU LOBATO TINHA UM SÍTIO | MÚSICA EM INGLÊS | LEO E LULLY" },
    { id: "a-_oj_VUYZk", titulo: "20 MIN MUSICAS EM INGLÊS | VOL. 04 | FAMILY FINGER, 5 LITTLE FROGS E MAIS | LEO E LULLY" },
    { id: "IkrJpF8n2xQ", titulo: "5 MÚSICAS PARA APRENDER INGLÊS | INGLÊS PARA CRIANÇAS | VOL. 02 | LEO E LULLY" },
    { id: "qL0ULO0JF_s", titulo: "PALAVRINHAS FÁCEIS EM INGLÊS #5| PALAVRAS EM INGLÊS PARA CRIANÇAS| APRENDER INGLÊS COM LEO E LULLY" },
    { id: "wN801RKFaCU", titulo: "O MELHOR VÍDEO PARA A CRIANÇA APRENDER INGLÊS | 40 MINUTOS DE VÍDEOS EM INGLÊS | INGLÊS INFANTIL" },
    { id: "YsNPpncmrzA", titulo: "10 MIN DE MÚSICAS EM INGLÊS | VOL. 02 | PAPAI DEDO, 1,2,3,4,5 PEIXINHOS, JOHNNY, JOHNNY| LEO E LULLY" },
    { id: "WFlOazB0JJ8", titulo: "ALPHABET SONG | MÚSICA DO ALFABETO | MÚSICA EM INGLÊS | LEO E LULLY" },
    { id: "6VG87pVdST8", titulo: "Leo & Lully - Five Little Monkeys Jumping On The Bed - Music" },
    { id: "h9OXptzoQak", titulo: "PALAVRINHAS FÁCEIS EM INGLÊS #3| PALAVRAS EM INGLÊS PARA CRIANÇAS| APRENDER INGLÊS COM LEO E LULLY" },
    { id: "H6wfkrIPkqM", titulo: "NUMBERS, COLORS AND SONGS| ANIMALS SONG AND MORE  | MÚSICAS EM INGLÊS | LEO E LULLY" },
    { id: "RdlvYRlmEpg", titulo: "5 MÚSICAS PARA CANTAR | MÚSICAS EM INGLÊS | LEO E LULLY" },
    { id: "L7R2krDSYvs", titulo: "10 MIN MÚSICAS EM INGLÊS | VOL. 01 | OLD MCDONALD, ALPHABET SONG E OUTRAS | LEO E LULLY" },
    { id: "Dy1Ok-wRf8M", titulo: "ANIMAIS E SAUDAÇÕES EM INGLÊS | CRIANÇAS E INICIANTES | LEO E LULLY" },
    { id: "feewCqRJVzI", titulo: "Leo & Lully on Johnny Johnny, yes Papa | Nursery Rhymes" },
    { id: "a6BS362UZEw", titulo: "Leo & Lully on Jenny Jenny, yes Mama | Nursery Rhymes" },
    { id: "G4FaB9k0OTU", titulo: "1,2,3,4,5 FISHES |  Leo and Lully | Nursery Rhymes" },
    { id: "Q9-6JtskU_0", titulo: "PALAVRINHAS FÁCEIS EM INGLÊS #4| PALAVRAS EM INGLÊS PARA CRIANÇAS| APRENDER INGLÊS COM LEO E LULLY" },
    { id: "lREnT-AWwzk", titulo: "1 HORA DE PALAVRINHAS FÁCEIS EM INGLÊS | COMBO DAS PALAVRINHAS FÁCEIS | 140 PALAVRAS | LEO E LULLY" },
    { id: "XtUdRs6udkg", titulo: "BINGO, O CÃOZINHO| MÚSICA EM INGLÊS | CANTANDO COM LEO E LULLY" },
    { id: "qLYw6NswNjM", titulo: "10 ANIMAIS EM INGLÊS | APRENDER BRINCANDO | INGLÊS PARA CRIANÇAS | LEO E LULLY" },
    { id: "hzbEGfHl11I", titulo: "Leo & Lully in Five Green and Speckled Frogs | Music" },
    { id: "cQivWSrx2iA", titulo: "PALAVRINHAS FÁCEIS EM INGLÊS #6| PALAVRAS EM INGLÊS PARA CRIANÇAS| APRENDER INGLÊS COM LEO E LULLY" },
    { id: "lpdNtDauC_U", titulo: "5 MÚSICAS PARA CANTAR E APRENDER INGLÊS | LEO E LULLY" },
    { id: "BNRYN6YGyQw", titulo: "5 MÚSICAS PARA APRENDER INGLÊS | INGLÊS PARA CRIANÇAS | VOL. 01 | LEO E LULLY" },
    { id: "ZK4AJ6m8pY4", titulo: "MÚSICAS EM INGLÊS | VOL. 01 | CINCO SAPINHOS E MAIS | LEO E LULLY" },
    { id: "HhyoiQ9Z0mo", titulo: "PALAVRINHAS FÁCEIS EM INGLÊS # 2|  PALAVRAS EM INGLÊS PARA CRIANÇAS| APRENDER INGLÊS COM LEO E LULLY" },
    { id: "OPSwqu1Rg70", titulo: "PANCAKES FOR MY MOM | PANQUECAS PARA A MAMÃE | RECEITA DE PANQUECAS| LEO E LULLY" },
    { id: "2xseLXg7RZo", titulo: "MY HAT IT HAS THREE CORNERS | O MEU CHAPÉU TEM TÊS PONTAS| MÚSICA EM INGLÊS | LEO E LULLY" },
  ],
  espanhol: [
    // fase 1
    { id: "n1NmYMQxBW0", titulo: "Learn Spanish for Kids • Common Words at Home • English to Spanish" },
    { id: "8yuiUvi568I", titulo: "Learn Spanish for Kids - Numbers, Colors & More - Rock 'N Learn" },
    { id: "BWOqJ3TTMmo", titulo: "Learn Spanish for Kids – Useful Phrases for Beginners" },
    { id: "9U96AXr9eBM", titulo: "Learn Spanish for Kids - Food, Activities & Animals" },
    { id: "aD5pRgDoYuw", titulo: "Learn Spanish for Kids – Body Parts, Family & Feelings - Rock 'N Learn" },
    // fase 2
    { id: "TVBrVen0-ls", titulo: "Family in Spanish | Spanish Class | Learn Spanish", fase: 2 },
    { id: "Vl4AbM8VF1o", titulo: "Cores em Espanhol | Espanhol Para Iniciantes | Los Colores", fase: 2 },
    { id: "t638KHr7S-c", titulo: "Aula de Espanhol | Sentimentos em Espanhol", fase: 2 },
    { id: "4Z86L9yX7iE", titulo: "Meses do Ano em Espanhol | Aula de Espanhol", fase: 2 },
    { id: "YdKEBs-ap5g", titulo: "Aula de Espanhol | Roupas em Espanhol | Espanhol Para Iniciantes", fase: 2 },
    { id: "9zVorzMpKh0", titulo: "Aula de Espanhol | Frutas em Espanhol | Frutas en Español", fase: 2 },
    { id: "gUVp0vux0f8", titulo: "Aula de Espanhol | Espanhol Para Iniciantes | Aprender Espanhol", fase: 2 },
    { id: "zOXI65YLZwo", titulo: "Aula de Espanhol | Alimentos em Espanhol | Comidas em Espanhol", fase: 2 },
    { id: "OK8pbOpH1FU", titulo: "Aprender Espanhol | Móveis da Casa em Espanhol | Objetos de la Casa", fase: 2 },
    { id: "fmyckVuQFfM", titulo: "Aprender Espanhol | Escola em Espanhol | Material Escolar em Espanhol", fase: 2 },
    { id: "GXw0nJSaYy8", titulo: "ALFABETO EM ESPANHOL AULA DE ESPANHOL AMIGO MUMU", fase: 2 },
    { id: "6jcNoHiPShY", titulo: "ESPANHOL PARA CRIANÇAS AMIGO MUMU | ATIVIDADES DE ESPANHOL", fase: 2 },
  ],
  alemao: [
    // fase 1
    { id: "gfu0SwwqDt8", titulo: "Learn German for Kids - Numbers, Colors & More - Rock 'N Learn" },
    { id: "hQbDvS8Pdd0", titulo: "Learn German for Kids – Body Parts, Family & Feelings" },
    // fase 2
    { id: "ESGm_pVRNnw", titulo: "Die Räder vom Bus | Kinderlieder deutsch | Das Buslied | Kinderlieder  zum Mitzingen", fase: 2 },
    { id: "r50eJVcxsXs", titulo: "ABC Lied Deutsch | Das ABC Buslied | Kinderlieder deutsch | German alphabet song", fase: 2 },
    { id: "IgF3YiYDoR4", titulo: "Hallo, hallo, schön, dass du da bist - Die besten Spiel - und Bewegungslieder || Kinderlieder", fase: 2 },
    { id: "AbhqEtDMBzg", titulo: "Wenn du fröhlich bist - Die besten Kindergartenlieder || Kinderlieder", fase: 2 },
    { id: "YH9e854RZCA", titulo: "Das Krokodil am Nil - Die besten Spiel- und Bewegungslieder || Kinderlieder", fase: 2 },
    { id: "a0nnRg1o5zU", titulo: "Hopp hopp hopp, Pferdchen, lauf Galopp - Die besten Spiel- und Bewegungslieder || Kinderlieder", fase: 2 },
    { id: "BXv0WZ9e508", titulo: "Teddybär, Teddybär, dreh dich um -  Die besten Spiel- und Bewegungslieder || Kinderlieder", fase: 2 },
    { id: "AhJwDwbeM7M", titulo: "Kinderlieder in Deutsch - Kindergarten - Wetterlied / Kinderlied / Videos für Kleinkinder /", fase: 2 },
    { id: "dGvCSK5PVnk", titulo: "Geburtstagslied - Kinder Party - Wie Schön Das Du Geboren Bist (Kinderlied)", fase: 2 },
    { id: "l0gFp3U49dY", titulo: "Faschingslied 🤡 Selbsterklärend-Bewegungslied 🤡Karneval Kinderlieder Kinderdisco Tanzlied Tierlieder", fase: 2 },
    { id: "RQls00aGXx4", titulo: "Funkel, funkel, kleiner Stern | Kinderlieder deutsch | Twinkle Twinkle in German", fase: 2 },
    { id: "qjW-RI9st1o", titulo: "Die Affen rasen durch den Wald - Die besten Partylieder für Kinder || Kinderlieder", fase: 2 },
    { id: "SQXyXcOgicI", titulo: "Zehn in einem Bett - Kinderlied Lernlied in Deutscher Sprache -Sing mit Yleekids", fase: 2 },
    { id: "JIm4EWtELGg", titulo: "Die Piraten | Kinderlied zum Mitsingen | Kindermusikwelt", fase: 2 },
    { id: "PWHcRoQuXQI", titulo: "Pigloo - Papa Pinguin deutsch / german", fase: 2 },
    { id: "0cSI4_WeSCk", titulo: "Es tanzt ein Bi-Ba-Butzemann - Kinderlieder zum Mitsingen | Sing Kinderlieder", fase: 2 },
    { id: "m9BFPn5hYgk", titulo: "Begrüßungslieder - Das Wachmacherlied", fase: 2 },
    { id: "dsDhuZVItp8", titulo: "Begrüßungslieder - Hurra, Hurra", fase: 2 },
    { id: "YN_fyB-Hx7A", titulo: "Aufräumlieder - 1,2,3 das Spielen ist vorbei", fase: 2 },
    { id: "qmuh06e2OQs", titulo: "Alle Leut\' - Die besten Spiel - und Bewegungslieder || Kinderlieder", fase: 2 },
    { id: "5kN0GKSb2dA", titulo: "Vídeo avulso de alemão", fase: 2 },
  ],
  frances: [
    { id: "AoIRXJaXBqc", titulo: "Learn French for Kids | Rock 'N Learn" },
    { id: "uyHIcOX4FaE", titulo: "Learn French for Kids - Numbers, Colors & More - Rock 'N Learn" },
  ],
  japones: [
    { id: "zYvfeacJZcU", titulo: "Learn Japanese for Kids - Numbers, Colors & More" },
  ],
  coreano: [
    { id: "3IxbUFzX0_o", titulo: "Learn Korean for Kids - Numbers, Colors & More" },
  ],
};

/* Achata { idioma: [{id,titulo}] } → [{id,titulo,idioma,fase}], com
   fase padrão 1 pra tudo que ainda não foi curado manualmente. */
function paraFormatoPlano(catalogoPorIdioma) {
  const plano = [];
  Object.keys(catalogoPorIdioma || {}).forEach((idioma) => {
    (catalogoPorIdioma[idioma] || []).forEach((v) => {
      plano.push({
        id: v.id,
        titulo: v.titulo,
        idioma,
        fase: Number(v.fase) === 2 ? 2 : 1,
      });
    });
  });
  return plano;
}

/* Lê o catálogo salvo pelo painel; se nunca foi salvo, usa o padrão
   acima (sempre devolve array plano, já com idioma+fase). */
function carregarVideos() {
  try {
    const salvo = localStorage.getItem(CHAVE_CATALOGO_VIDEOS);
    if (salvo) {
      const parsed = JSON.parse(salvo);
      return Array.isArray(parsed) ? parsed : paraFormatoPlano(parsed);
    }
  } catch { }
  return paraFormatoPlano(VIDEO_CATALOG_PADRAO);
}

function salvarVideos(listaPlana) {
  localStorage.setItem(CHAVE_CATALOGO_VIDEOS, JSON.stringify(listaPlana));
}
