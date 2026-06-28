-- seed_scorer_odds.sql — Effectifs officiels CDM 2026 (48 équipes)
-- Sources: football365.com, Wikipedia 2026 FIFA World Cup squads, FIFA.com
-- Données vérifiées au 10 juin 2026 — squads officiels soumis à la FIFA.
-- Idempotent : WHERE NOT EXISTS sur (match_id, player_name).
--
-- La CTE team_name_map gère toutes les variantes de noms selon la source API.
-- Exécuter dans : Supabase Dashboard → SQL Editor

WITH players (player_name, team, odds) AS (VALUES

  -- ════════════════════════════════════════════════════════════════════════
  -- GROUPE A
  -- ════════════════════════════════════════════════════════════════════════

  -- MEXICO
  ('Santiago Giménez',   'Mexico', 2.20),
  ('Raúl Jiménez',       'Mexico', 2.80),
  ('Julián Quiñones',    'Mexico', 3.00),
  ('Alexis Vega',        'Mexico', 3.20),
  ('César Huerta',       'Mexico', 3.50),
  ('Armando González',   'Mexico', 4.00),
  ('Roberto Alvarado',   'Mexico', 4.00),
  ('Guillermo Martínez', 'Mexico', 4.50),
  ('Orbelín Pineda',     'Mexico', 4.50),
  ('Brian Gutiérrez',    'Mexico', 5.00),
  ('Obed Vargas',        'Mexico', 5.50),
  ('Luis Chávez',        'Mexico', 5.50),
  ('Gilberto Mora',      'Mexico', 6.50),

  -- SOUTH AFRICA
  ('Lyle Foster',            'South Africa', 3.00),
  ('Evidence Makgopa',       'South Africa', 3.50),
  ('Iqraam Rayners',         'South Africa', 3.80),
  ('Oswin Appollis',         'South Africa', 4.00),
  ('Relebohile Mofokeng',    'South Africa', 4.00),
  ('Thapelo Maseko',         'South Africa', 4.50),
  ('Kamogelo Sebelebele',    'South Africa', 5.00),
  ('Themba Zwane',           'South Africa', 5.00),
  ('Thalente Mbatha',        'South Africa', 6.50),
  ('Jayden Adams',           'South Africa', 6.50),
  ('Teboho Mokoena',         'South Africa', 7.00),

  -- SOUTH KOREA
  ('Son Heung-min',   'South Korea', 2.20),
  ('Lee Kang-in',     'South Korea', 3.00),
  ('Hwang Hee-chan',  'South Korea', 3.50),
  ('Cho Gue-sung',    'South Korea', 4.00),
  ('Yang Hyun-jun',   'South Korea', 5.00),
  ('Oh Hyeon-gyu',    'South Korea', 5.00),
  ('Bae Jun-ho',      'South Korea', 5.50),
  ('Eom Ji-sung',     'South Korea', 6.00),
  ('Lee Jae-sung',    'South Korea', 6.50),
  ('Lee Dong-gyeong', 'South Korea', 7.00),

  -- CZECH REPUBLIC
  ('Patrik Schick',   'Czech Republic', 2.50),
  ('Adam Hložek',     'Czech Republic', 3.50),
  ('Jan Kuchta',      'Czech Republic', 4.00),
  ('Mojmír Chytil',   'Czech Republic', 4.00),
  ('Tomáš Chorý',     'Czech Republic', 4.00),
  ('Pavel Šulc',      'Czech Republic', 5.00),
  ('Denis Višinský',  'Czech Republic', 5.00),
  ('Lukáš Provod',    'Czech Republic', 6.00),
  ('Tomáš Souček',    'Czech Republic', 6.00),
  ('Lukáš Červ',      'Czech Republic', 7.00),

  -- ════════════════════════════════════════════════════════════════════════
  -- GROUPE B
  -- ════════════════════════════════════════════════════════════════════════

  -- CANADA
  ('Jonathan David',    'Canada', 2.20),
  ('Cyle Larin',        'Canada', 3.00),
  ('Tajon Buchanan',    'Canada', 3.50),
  ('Tani Oluwaseyi',    'Canada', 4.00),
  ('Promise David',     'Canada', 4.00),
  ('Mathieu Choinière', 'Canada', 4.00),
  ('Liam Millar',       'Canada', 4.50),
  ('Jacob Shaffelburg', 'Canada', 5.00),
  ('Ali Ahmed',         'Canada', 5.50),
  ('Jayden Nelson',     'Canada', 6.00),

  -- BOSNIA-HERZEGOVINA
  ('Edin Džeko',           'Bosnia-Herzegovina', 2.80),
  ('Ermedin Demirović',    'Bosnia-Herzegovina', 3.00),
  ('Haris Tabaković',      'Bosnia-Herzegovina', 3.50),
  ('Samed Baždar',         'Bosnia-Herzegovina', 4.00),
  ('Kerim Alajbegović',    'Bosnia-Herzegovina', 4.50),
  ('Esmir Bajraktarević',  'Bosnia-Herzegovina', 4.50),
  ('Jovo Lukić',           'Bosnia-Herzegovina', 5.00),
  ('Benjamin Tahirović',   'Bosnia-Herzegovina', 5.50),
  ('Armin Gigović',        'Bosnia-Herzegovina', 6.00),

  -- QATAR
  ('Akram Afif',       'Qatar', 3.00),
  ('Almoez Ali',       'Qatar', 3.20),
  ('Edmilson Junior',  'Qatar', 3.50),
  ('Mohammed Muntari', 'Qatar', 3.80),
  ('Ahmed Alaaeldin',  'Qatar', 4.50),
  ('Hassan Al-Haydos', 'Qatar', 4.50),
  ('Yusuf Abdurisag',  'Qatar', 5.00),
  ('Tahsin Jamshid',   'Qatar', 5.50),

  -- SWITZERLAND
  ('Breel Embolo',        'Switzerland', 2.80),
  ('Zeki Amdouni',        'Switzerland', 3.00),
  ('Noah Okafor',         'Switzerland', 3.20),
  ('Dan Ndoye',           'Switzerland', 3.50),
  ('Cédric Itten',        'Switzerland', 4.00),
  ('Ruben Vargas',        'Switzerland', 4.00),
  ('Christian Fassnacht', 'Switzerland', 4.50),
  ('Fabian Rieder',       'Switzerland', 5.00),
  ('Michel Aebischer',    'Switzerland', 6.00),
  ('Granit Xhaka',        'Switzerland', 7.00),

  -- ════════════════════════════════════════════════════════════════════════
  -- GROUPE C
  -- ════════════════════════════════════════════════════════════════════════

  -- BRAZIL
  ('Vinícius Júnior',    'Brazil', 1.90),
  ('Neymar',             'Brazil', 2.00),
  ('Raphinha',           'Brazil', 2.50),
  ('Gabriel Martinelli', 'Brazil', 3.00),
  ('Igor Thiago',        'Brazil', 3.00),
  ('Matheus Cunha',      'Brazil', 3.20),
  ('Endrick',            'Brazil', 3.20),
  ('Luiz Henrique',      'Brazil', 3.50),
  ('Rayan',              'Brazil', 4.50),
  ('Lucas Paquetá',      'Brazil', 4.50),
  ('Éderson Silva',      'Brazil', 6.00),

  -- MOROCCO
  ('Ayoub El Kaabi',     'Morocco', 2.50),
  ('Soufiane Rahimi',    'Morocco', 3.00),
  ('Brahim Díaz',        'Morocco', 3.00),
  ('Abde Ezzalzouli',    'Morocco', 3.20),
  ('Ayoube Amaimouni',   'Morocco', 4.50),
  ('Chemsdine Talbi',    'Morocco', 4.50),
  ('Bilal El Khannouss', 'Morocco', 5.00),
  ('Ismael Saibari',     'Morocco', 5.00),
  ('Azzedine Ounahi',    'Morocco', 5.50),
  ('Neil El Aynaoui',    'Morocco', 6.00),
  ('Ayyoub Bouaddi',     'Morocco', 6.50),
  ('Sofyan Amrabat',     'Morocco', 8.00),

  -- HAITI
  ('Wilson Isidor',         'Haiti', 3.50),
  ('Frantzdy Pierrot',      'Haiti', 4.00),
  ('Derrick Etienne Jr',    'Haiti', 4.00),
  ('Duckens Nazon',         'Haiti', 4.50),
  ('Ruben Providence',      'Haiti', 5.00),
  ('Lenny Joseph',          'Haiti', 5.50),
  ('Jean-Ricner Bellegarde','Haiti', 5.50),
  ('Josue Casimir',         'Haiti', 6.00),
  ('Yassin Fortune',        'Haiti', 6.50),

  -- SCOTLAND
  ('Lawrence Shankland', 'Scotland', 3.00),
  ('Lyndon Dykes',       'Scotland', 3.50),
  ('Ché Adams',          'Scotland', 3.50),
  ('Ross Stewart',       'Scotland', 4.00),
  ('Ben Doak',           'Scotland', 4.00),
  ('George Hirst',       'Scotland', 4.50),
  ('Findlay Curtis',     'Scotland', 5.50),
  ('Scott McTominay',    'Scotland', 5.50),
  ('John McGinn',        'Scotland', 6.00),
  ('Ryan Christie',      'Scotland', 6.50),

  -- ════════════════════════════════════════════════════════════════════════
  -- GROUPE D
  -- ════════════════════════════════════════════════════════════════════════

  -- UNITED STATES
  ('Christian Pulisic',  'United States', 2.50),
  ('Folarin Balogun',    'United States', 3.00),
  ('Haji Wright',        'United States', 3.50),
  ('Giovanni Reyna',     'United States', 3.50),
  ('Tim Weah',           'United States', 3.80),
  ('Ricardo Pepi',       'United States', 4.00),
  ('Brenden Aaronson',   'United States', 4.50),
  ('Malik Tillman',      'United States', 4.50),
  ('Alejandro Zendejas', 'United States', 4.50),
  ('Weston McKennie',    'United States', 6.00),

  -- PARAGUAY
  ('Antonio Sanabria',   'Paraguay', 3.00),
  ('Julio Enciso',       'Paraguay', 3.20),
  ('Miguel Almirón',     'Paraguay', 3.50),
  ('Gabriel Ávalos',     'Paraguay', 3.80),
  ('Kaku',               'Paraguay', 4.00),
  ('Ramón Sosa',         'Paraguay', 4.50),
  ('Alex Arce',          'Paraguay', 4.50),
  ('Isidro Pitta',       'Paraguay', 5.00),
  ('Diego Gómez',        'Paraguay', 5.50),
  ('Matías Galarza',     'Paraguay', 6.00),

  -- AUSTRALIA
  ('Mathew Leckie',     'Australia', 3.50),
  ('Nestory Irankunda', 'Australia', 3.80),
  ('Awer Mabil',        'Australia', 4.00),
  ('Tete Yengi',        'Australia', 4.00),
  ('Cristian Volpato',  'Australia', 4.50),
  ('Mohamed Toure',     'Australia', 4.50),
  ('Nishan Velupillay', 'Australia', 5.00),
  ('Ajdin Hrustic',     'Australia', 5.50),
  ('Connor Metcalfe',   'Australia', 6.50),

  -- TURKEY
  ('Arda Güler',          'Turkey', 2.50),
  ('Kerem Aktürkoğlu',    'Turkey', 3.00),
  ('Kenan Yıldız',        'Turkey', 3.20),
  ('İrfan Can Kahveci',   'Turkey', 3.50),
  ('Barış Alper Yılmaz',  'Turkey', 3.80),
  ('Yunus Akgün',         'Turkey', 3.80),
  ('Can Uzun',            'Turkey', 4.00),
  ('Deniz Gül',           'Turkey', 4.50),
  ('Hakan Çalhanoğlu',    'Turkey', 4.50),
  ('Oğuz Aydın',          'Turkey', 5.00),
  ('Orkun Kökcü',         'Turkey', 5.50),

  -- ════════════════════════════════════════════════════════════════════════
  -- GROUPE E
  -- ════════════════════════════════════════════════════════════════════════

  -- GERMANY
  ('Jamal Musiala',    'Germany', 2.50),
  ('Kai Havertz',      'Germany', 2.80),
  ('Florian Wirtz',    'Germany', 3.00),
  ('Leroy Sané',       'Germany', 3.00),
  ('Maximilian Beier', 'Germany', 3.50),
  ('Deniz Undav',      'Germany', 3.80),
  ('Nick Woltemade',   'Germany', 4.00),
  ('Jamie Leweling',   'Germany', 4.50),
  ('Assan Ouédraogo',  'Germany', 5.50),
  ('Pascal Gross',     'Germany', 5.50),
  ('Nadiem Amiri',     'Germany', 6.00),
  ('Leon Goretzka',    'Germany', 6.00),
  ('Felix Nmecha',     'Germany', 6.50),
  ('Joshua Kimmich',   'Germany', 8.00),

  -- IVORY COAST
  ('Amad Diallo',        'Ivory Coast', 2.80),
  ('Elye Wahi',          'Ivory Coast', 3.00),
  ('Ange-Yoan Bonny',    'Ivory Coast', 3.20),
  ('Simon Adingra',      'Ivory Coast', 3.50),
  ('Evann Guessand',     'Ivory Coast', 3.80),
  ('Nicolas Pépé',       'Ivory Coast', 4.00),
  ('Oumar Diakité',      'Ivory Coast', 4.50),
  ('Yan Diomandé',       'Ivory Coast', 5.00),
  ('Bazouamana Traoré',  'Ivory Coast', 5.50),
  ('Franck Kessié',      'Ivory Coast', 5.50),
  ('Seko Fofana',        'Ivory Coast', 6.00),

  -- ECUADOR
  ('Enner Valencia',   'Ecuador', 2.80),
  ('Anthony Valencia', 'Ecuador', 3.00),
  ('Gonzalo Plata',    'Ecuador', 3.20),
  ('Jordy Caicedo',    'Ecuador', 3.80),
  ('Jeremy Arévalo',   'Ecuador', 4.00),
  ('Kevin Rodríguez',  'Ecuador', 4.50),
  ('Nilson Angulo',    'Ecuador', 5.00),
  ('Kendry Páez',      'Ecuador', 5.00),
  ('John Yeboah',      'Ecuador', 5.50),
  ('Moisés Caicedo',   'Ecuador', 6.50),

  -- CURACAO
  ('Sontje Hansen',     'Curacao', 3.50),
  ('Tahith Chong',      'Curacao', 4.00),
  ('Gervane Kastaneer', 'Curacao', 4.50),
  ('Brandley Kuwas',    'Curacao', 4.50),
  ('Jurgen Locadia',    'Curacao', 5.00),
  ('Kenji Gorre',       'Curacao', 5.00),
  ('Jearl Margaritha',  'Curacao', 5.50),
  ('Tyrese Noslin',     'Curacao', 5.50),

  -- ════════════════════════════════════════════════════════════════════════
  -- GROUPE F
  -- ════════════════════════════════════════════════════════════════════════

  -- NETHERLANDS
  ('Cody Gakpo',            'Netherlands', 2.50),
  ('Brian Brobbey',         'Netherlands', 2.80),
  ('Donyell Malen',         'Netherlands', 3.00),
  ('Noa Lang',              'Netherlands', 3.20),
  ('Memphis Depay',         'Netherlands', 3.20),
  ('Crysencio Summerville', 'Netherlands', 3.50),
  ('Wout Weghorst',         'Netherlands', 3.80),
  ('Justin Kluivert',       'Netherlands', 4.00),
  ('Tijjani Reijnders',     'Netherlands', 5.00),
  ('Teun Koopmeiners',      'Netherlands', 5.50),
  ('Guus Til',              'Netherlands', 6.00),
  ('Ryan Gravenberch',      'Netherlands', 6.50),

  -- JAPAN
  ('Ayase Ueda',     'Japan', 3.00),
  ('Daizen Maeda',   'Japan', 3.50),
  ('Koki Ogawa',     'Japan', 3.50),
  ('Ritsu Doan',     'Japan', 3.80),
  ('Daichi Kamada',  'Japan', 4.00),
  ('Junya Ito',      'Japan', 4.00),
  ('Takefusa Kubo',  'Japan', 4.00),
  ('Keito Nakamura', 'Japan', 4.50),
  ('Keisuke Goto',   'Japan', 5.00),
  ('Yuito Suzuki',   'Japan', 5.00),
  ('Kento Shiogai',  'Japan', 5.50),

  -- SWEDEN
  ('Viktor Gyökeres',        'Sweden', 2.00),
  ('Alexander Isak',         'Sweden', 2.20),
  ('Anthony Elanga',         'Sweden', 3.50),
  ('Gustaf Nilsson',         'Sweden', 4.00),
  ('Benjamin Nygren',        'Sweden', 4.50),
  ('Alexander Bernhardsson', 'Sweden', 5.00),
  ('Ken Sema',               'Sweden', 5.50),
  ('Mattias Svanberg',       'Sweden', 6.00),
  ('Lucas Bergvall',         'Sweden', 6.50),

  -- TUNISIA
  ('Ismael Gharbi',      'Tunisia', 3.50),
  ('Elias Saad',         'Tunisia', 4.00),
  ('Hazem Mastouri',     'Tunisia', 4.00),
  ('Firas Chaouat',      'Tunisia', 4.50),
  ('Sebastian Tounekti', 'Tunisia', 4.50),
  ('Khalil Ayari',       'Tunisia', 5.00),
  ('Hannibal Mejbri',    'Tunisia', 5.00),
  ('Anis Ben Slimane',   'Tunisia', 5.50),
  ('Elias Achouri',      'Tunisia', 5.50),
  ('Rayan Elloumi',      'Tunisia', 6.00),

  -- ════════════════════════════════════════════════════════════════════════
  -- GROUPE G
  -- ════════════════════════════════════════════════════════════════════════

  -- BELGIUM
  ('Romelu Lukaku',          'Belgium', 2.00),
  ('Jeremy Doku',            'Belgium', 3.00),
  ('Leandro Trossard',       'Belgium', 3.00),
  ('Charles De Ketelaere',   'Belgium', 3.50),
  ('Dodi Lukebakio',         'Belgium', 3.50),
  ('Alexis Saelemaekers',    'Belgium', 4.00),
  ('Matias Fernandez-Pardo', 'Belgium', 4.50),
  ('Diego Moreira',          'Belgium', 4.50),
  ('Kevin De Bruyne',        'Belgium', 5.00),
  ('Hans Vanaken',           'Belgium', 5.50),
  ('Youri Tielemans',        'Belgium', 6.00),
  ('Amadou Onana',           'Belgium', 7.00),

  -- EGYPT
  ('Mohamed Salah',    'Egypt', 1.90),
  ('Omar Marmoush',    'Egypt', 3.00),
  ('Trezeguet',        'Egypt', 3.50),
  ('Ibrahim Adel',     'Egypt', 4.00),
  ('Haissem Hassan',   'Egypt', 4.50),
  ('Hamza Abdelkarim', 'Egypt', 4.50),
  ('Ahmed Zizo',       'Egypt', 5.00),
  ('Emam Ashour',      'Egypt', 6.50),

  -- IRAN
  ('Mehdi Taremi',             'Iran', 2.50),
  ('Ali Alipour',              'Iran', 3.50),
  ('Saman Ghoddos',            'Iran', 4.00),
  ('Alireza Jahanbakhsh',      'Iran', 4.00),
  ('Mehdi Torabi',             'Iran', 4.50),
  ('Dennis Eckert',            'Iran', 4.50),
  ('Mehdi Ghayedi',            'Iran', 5.00),
  ('Amirhossein Hosseinzadeh', 'Iran', 5.00),
  ('Shahriyar Moghanlou',      'Iran', 5.50),

  -- NEW ZEALAND
  ('Chris Wood',        'New Zealand', 3.00),
  ('Ben Waine',         'New Zealand', 4.00),
  ('Kosta Barbarouses', 'New Zealand', 4.50),
  ('Ben Old',           'New Zealand', 4.50),
  ('Callum McCowatt',   'New Zealand', 5.00),
  ('Jesse Randall',     'New Zealand', 5.00),
  ('Eli Just',          'New Zealand', 5.50),
  ('Matt Garbett',      'New Zealand', 5.50),
  ('Sarpreet Singh',    'New Zealand', 6.00),

  -- ════════════════════════════════════════════════════════════════════════
  -- GROUPE H
  -- ════════════════════════════════════════════════════════════════════════

  -- SPAIN
  ('Lamine Yamal',    'Spain', 2.50),
  ('Nico Williams',   'Spain', 2.80),
  ('Ferran Torres',   'Spain', 3.00),
  ('Mikel Oyarzabal', 'Spain', 3.20),
  ('Dani Olmo',       'Spain', 3.50),
  ('Yéremy Pino',     'Spain', 4.00),
  ('Borja Iglesias',  'Spain', 4.00),
  ('Víctor Muñoz',    'Spain', 4.50),
  ('Álex Baena',      'Spain', 5.00),
  ('Pedri',           'Spain', 5.00),
  ('Gavi',            'Spain', 5.50),
  ('Mikel Merino',    'Spain', 6.00),
  ('Fabián Ruiz',     'Spain', 6.00),
  ('Rodri',           'Spain', 8.00),

  -- CAPE VERDE
  ('Ryan Mendes',       'Cape Verde', 4.00),
  ('Garry Rodrigues',   'Cape Verde', 4.00),
  ('Dailon Livramento', 'Cape Verde', 4.50),
  ('Willy Semedo',      'Cape Verde', 4.50),
  ('Jovane Cabral',     'Cape Verde', 4.50),
  ('Helio Varela',      'Cape Verde', 5.00),
  ('Gilson Benchimol',  'Cape Verde', 5.00),
  ('Nuno da Costa',     'Cape Verde', 5.00),
  ('Jamiro Monteiro',   'Cape Verde', 5.50),

  -- SAUDI ARABIA
  ('Salem Al-Dawsari',   'Saudi Arabia', 3.00),
  ('Firas Al-Buraikan',  'Saudi Arabia', 3.50),
  ('Abdullah Al-Hamdan', 'Saudi Arabia', 4.00),
  ('Saleh Al-Shehri',    'Saudi Arabia', 4.00),
  ('Ayman Yahya',        'Saudi Arabia', 4.50),
  ('Musab Al-Juwayr',    'Saudi Arabia', 4.50),
  ('Nasser Al-Dawsari',  'Saudi Arabia', 5.00),
  ('Khalid Al-Ghannam',  'Saudi Arabia', 5.50),
  ('Sultan Mandash',     'Saudi Arabia', 6.00),

  -- URUGUAY
  ('Darwin Núñez',           'Uruguay', 2.20),
  ('Federico Viñas',         'Uruguay', 3.50),
  ('Rodrigo Aguirre',        'Uruguay', 4.00),
  ('Facundo Pellistri',      'Uruguay', 4.00),
  ('Giorgian De Arrascaeta', 'Uruguay', 4.50),
  ('Agustín Canobbio',       'Uruguay', 4.50),
  ('Maximiliano Araújo',     'Uruguay', 5.00),
  ('Brian Rodríguez',        'Uruguay', 5.00),
  ('Nicolás De La Cruz',     'Uruguay', 5.50),
  ('Federico Valverde',      'Uruguay', 6.00),
  ('Rodrigo Bentancur',      'Uruguay', 7.00),

  -- ════════════════════════════════════════════════════════════════════════
  -- GROUPE I
  -- ════════════════════════════════════════════════════════════════════════

  -- FRANCE
  ('Kylian Mbappé',        'France', 1.80),
  ('Ousmane Dembélé',      'France', 2.80),
  ('Marcus Thuram',        'France', 3.00),
  ('Bradley Barcola',      'France', 3.20),
  ('Rayan Cherki',         'France', 3.50),
  ('Michael Olise',        'France', 3.50),
  ('Jean-Philippe Mateta', 'France', 3.80),
  ('Désiré Doué',          'France', 4.00),
  ('Maghnes Akliouche',    'France', 4.50),
  ('Adrien Rabiot',        'France', 6.00),
  ('Manu Koné',            'France', 7.00),
  ('Aurélien Tchouaméni',  'France', 7.00),
  ('Warren Zaïre-Emery',   'France', 7.00),

  -- SENEGAL
  ('Sadio Mané',      'Senegal', 2.00),
  ('Nicolas Jackson', 'Senegal', 3.00),
  ('Ismaïla Sarr',    'Senegal', 3.00),
  ('Iliman Ndiaye',   'Senegal', 3.20),
  ('Assane Diao',     'Senegal', 3.80),
  ('Bamba Dieng',     'Senegal', 4.00),
  ('Chérif Ndiaye',   'Senegal', 4.50),
  ('Ibrahim Mbaye',   'Senegal', 5.00),
  ('Habib Diarra',    'Senegal', 5.50),
  ('Pape Matar Sarr', 'Senegal', 6.00),
  ('Lamine Camara',   'Senegal', 6.00),

  -- IRAQ
  ('Ali Al-Hamadi', 'Iraq', 3.50),
  ('Aymen Hussein', 'Iraq', 4.00),
  ('Ali Jasim',     'Iraq', 4.50),
  ('Mohanad Ali',   'Iraq', 4.50),
  ('Ahmed Qasem',   'Iraq', 5.00),
  ('Ali Yousuf',    'Iraq', 5.50),
  ('Zidane Iqbal',  'Iraq', 5.50),
  ('Marko Farji',   'Iraq', 5.50),
  ('Kevin Yakob',   'Iraq', 6.00),

  -- NORWAY
  ('Erling Haaland',       'Norway', 1.70),
  ('Alexander Sørloth',    'Norway', 3.00),
  ('Jørgen Strand Larsen', 'Norway', 3.50),
  ('Martin Ødegaard',      'Norway', 4.00),
  ('Antonio Nusa',         'Norway', 4.00),
  ('Oscar Bobb',           'Norway', 4.50),
  ('Andreas Schjelderup',  'Norway', 5.00),
  ('Thelo Aasgaard',       'Norway', 5.50),
  ('Jens Petter Hauge',    'Norway', 6.00),
  ('Sander Berge',         'Norway', 7.00),

  -- ════════════════════════════════════════════════════════════════════════
  -- GROUPE J
  -- ════════════════════════════════════════════════════════════════════════

  -- ARGENTINA
  ('Lionel Messi',        'Argentina', 2.00),
  ('Lautaro Martínez',    'Argentina', 2.20),
  ('Julián Álvarez',      'Argentina', 2.50),
  ('Nicolás González',    'Argentina', 3.50),
  ('Thiago Almada',       'Argentina', 4.00),
  ('Giuliano Simeone',    'Argentina', 4.50),
  ('Nico Paz',            'Argentina', 5.00),
  ('José Manuel López',   'Argentina', 5.50),
  ('Giovani Lo Celso',    'Argentina', 5.50),
  ('Enzo Fernández',      'Argentina', 5.50),
  ('Alexis Mac Allister', 'Argentina', 6.00),
  ('Rodrigo De Paul',     'Argentina', 6.00),

  -- ALGERIA
  ('Riyad Mahrez',     'Algeria', 2.80),
  ('Mohamed Amoura',   'Algeria', 3.00),
  ('Amine Gouiri',     'Algeria', 3.20),
  ('Anis Hadj Moussa', 'Algeria', 3.50),
  ('Nadhir Benbouali', 'Algeria', 4.00),
  ('Fares Ghedjemis',  'Algeria', 4.00),
  ('Ibrahim Maza',     'Algeria', 4.50),
  ('Adil Boulbina',    'Algeria', 5.00),
  ('Houssem Aouar',    'Algeria', 5.00),
  ('Fares Chaibi',     'Algeria', 5.50),
  ('Hicham Boudaoui',  'Algeria', 6.00),
  ('Nabil Bentaleb',   'Algeria', 7.00),

  -- AUSTRIA
  ('Marko Arnautović',    'Austria', 3.00),
  ('Michael Gregoritsch', 'Austria', 3.50),
  ('Sasa Kalajdzic',      'Austria', 3.50),
  ('Patrick Wimmer',      'Austria', 4.50),
  ('Romano Schmid',       'Austria', 5.00),
  ('Marcel Sabitzer',     'Austria', 5.00),
  ('Paul Wanner',         'Austria', 5.50),
  ('Carney Chukwuemeka',  'Austria', 5.50),
  ('Konrad Laimer',       'Austria', 6.50),

  -- JORDAN
  ('Musa Al-Taamari',    'Jordan', 4.50),
  ('Mohammad Abu Zrayq', 'Jordan', 5.00),
  ('Odeh Al-Fakhouri',   'Jordan', 5.00),
  ('Mahmoud Al-Mardi',   'Jordan', 5.50),
  ('Ali Olwan',          'Jordan', 5.50),
  ('Ali Azaizeh',        'Jordan', 6.00),

  -- ════════════════════════════════════════════════════════════════════════
  -- GROUPE K
  -- ════════════════════════════════════════════════════════════════════════

  -- PORTUGAL
  ('Cristiano Ronaldo',   'Portugal', 2.00),
  ('Rafael Leão',         'Portugal', 2.80),
  ('Gonçalo Ramos',       'Portugal', 3.00),
  ('Pedro Neto',          'Portugal', 3.20),
  ('João Félix',          'Portugal', 3.20),
  ('Francisco Conceição', 'Portugal', 3.50),
  ('Gonçalo Guedes',      'Portugal', 4.00),
  ('Bruno Fernandes',     'Portugal', 4.00),
  ('Francisco Trincão',   'Portugal', 4.50),
  ('Bernardo Silva',      'Portugal', 5.00),
  ('Vitinha',             'Portugal', 7.00),

  -- DR CONGO
  ('Yoane Wissa',     'DR Congo', 3.00),
  ('Cédric Bakambu',  'DR Congo', 3.50),
  ('Simon Banza',     'DR Congo', 3.80),
  ('Gaël Kakuta',     'DR Congo', 4.00),
  ('Fiston Mayele',   'DR Congo', 4.50),
  ('Brian Cipenga',   'DR Congo', 5.00),
  ('Nathanaël Mbuku', 'DR Congo', 5.00),
  ('Théo Bongonda',   'DR Congo', 5.00),
  ('Meschak Elia',    'DR Congo', 5.50),

  -- UZBEKISTAN
  ('Eldor Shomurodov',      'Uzbekistan', 3.00),
  ('Abbosbek Fayzullaev',   'Uzbekistan', 4.00),
  ('Azizbek Amonov',        'Uzbekistan', 4.50),
  ('Igor Sergeev',          'Uzbekistan', 4.50),
  ('Jaloliddin Masharipov', 'Uzbekistan', 5.00),
  ('Oston Urunov',          'Uzbekistan', 5.50),
  ('Dostonbek Khamdamov',   'Uzbekistan', 6.00),

  -- COLOMBIA
  ('Luis Díaz',              'Colombia', 2.50),
  ('Cucho Hernández',        'Colombia', 3.00),
  ('Jhon Córdoba',           'Colombia', 3.50),
  ('Jhon Arias',             'Colombia', 4.00),
  ('Luis Suárez',            'Colombia', 4.00),
  ('James Rodríguez',        'Colombia', 4.50),
  ('Jorge Carrascal',        'Colombia', 5.00),
  ('Juan Fernando Quintero', 'Colombia', 5.00),
  ('Jaminton Campaz',        'Colombia', 5.50),
  ('Richard Rios',           'Colombia', 6.00),
  ('Carlos Andrés Gómez',    'Colombia', 6.00),

  -- ════════════════════════════════════════════════════════════════════════
  -- GROUPE L
  -- ════════════════════════════════════════════════════════════════════════

  -- ENGLAND
  ('Harry Kane',      'England', 1.90),
  ('Bukayo Saka',     'England', 2.80),
  ('Marcus Rashford', 'England', 3.00),
  ('Ollie Watkins',   'England', 3.20),
  ('Ivan Toney',      'England', 3.50),
  ('Jude Bellingham', 'England', 3.50),
  ('Anthony Gordon',  'England', 3.80),
  ('Noni Madueke',    'England', 4.00),
  ('Eberechi Eze',    'England', 4.00),
  ('Morgan Rogers',   'England', 5.50),
  ('Kobbie Mainoo',   'England', 6.00),
  ('Declan Rice',     'England', 8.00),

  -- CROATIA
  ('Andrej Kramarić', 'Croatia', 2.80),
  ('Ivan Perišić',    'Croatia', 3.00),
  ('Ante Budimir',    'Croatia', 3.50),
  ('Petar Musa',      'Croatia', 3.50),
  ('Igor Matanović',  'Croatia', 4.00),
  ('Nikola Vlašić',   'Croatia', 4.50),
  ('Mario Pašalić',   'Croatia', 4.50),
  ('Luka Sučić',      'Croatia', 5.00),
  ('Martin Baturina', 'Croatia', 5.50),
  ('Mateo Kovačić',   'Croatia', 6.00),
  ('Luka Modrić',     'Croatia', 7.00),

  -- GHANA
  ('Iñaki Williams',         'Ghana', 3.20),
  ('Kamaldeen Sulemana',     'Ghana', 3.50),
  ('Jordan Ayew',            'Ghana', 3.80),
  ('Ernest Nuamah',          'Ghana', 4.00),
  ('Christopher Bonsu Baah', 'Ghana', 4.00),
  ('Abdul Fatawu',           'Ghana', 4.00),
  ('Brandon Thomas-Asante',  'Ghana', 4.50),
  ('Antoine Semenyo',        'Ghana', 4.50),
  ('Prince Kwabena Adu',     'Ghana', 5.00),
  ('Thomas Partey',          'Ghana', 7.00),

  -- PANAMA
  ('Cecilio Waterman',       'Panama', 4.00),
  ('José Fajardo',           'Panama', 4.00),
  ('Tomás Rodríguez',        'Panama', 4.50),
  ('Ismael Díaz',            'Panama', 4.50),
  ('Azarias Londono',        'Panama', 5.00),
  ('Yoel Bárcenas',          'Panama', 5.00),
  ('Adalberto Carrasquilla', 'Panama', 5.50),
  ('Alberto Quintero',       'Panama', 6.00)

),

-- Toutes les variantes de noms d'équipes selon la source (football-data.org, API-Football, etc.)
team_name_map (canonical, variant) AS (VALUES
  ('Argentina',         'Argentina'),
  ('Australia',         'Australia'),
  ('Algeria',           'Algeria'),
  ('Austria',           'Austria'),
  ('Belgium',           'Belgium'),
  ('Brazil',            'Brazil'),
  ('Brazil',            'Brasil'),
  ('Bosnia-Herzegovina','Bosnia and Herzegovina'),
  ('Bosnia-Herzegovina','Bosnia & Herzegovina'),
  ('Bosnia-Herzegovina','Bosnia-Herzegovina'),
  ('Bosnia-Herzegovina','Bosnia-Hercegovina'),
  ('Canada',            'Canada'),
  ('Cape Verde',        'Cabo Verde'),
  ('Cape Verde',        'Cape Verde'),
  ('Cape Verde',        'Cape Verde Islands'),
  ('Colombia',          'Colombia'),
  ('Croatia',           'Croatia'),
  ('Czech Republic',    'Czechia'),
  ('Czech Republic',    'Czech Republic'),
  ('Curacao',           'Curaçao'),
  ('Curacao',           'Curacao'),
  ('DR Congo',          'Congo DR'),
  ('DR Congo',          'DR Congo'),
  ('DR Congo',          'Democratic Republic of Congo'),
  ('Ecuador',           'Ecuador'),
  ('Egypt',             'Egypt'),
  ('England',           'England'),
  ('France',            'France'),
  ('Germany',           'Germany'),
  ('Ghana',             'Ghana'),
  ('Haiti',             'Haiti'),
  ('Iran',              'IR Iran'),
  ('Iran',              'Iran'),
  ('Iraq',              'Iraq'),
  ('Ivory Coast',       'Côte d''Ivoire'),
  ('Ivory Coast',       'Cote d''Ivoire'),
  ('Ivory Coast',       'Ivory Coast'),
  ('Japan',             'Japan'),
  ('Jordan',            'Jordan'),
  ('Mexico',            'Mexico'),
  ('Morocco',           'Morocco'),
  ('Netherlands',       'Netherlands'),
  ('New Zealand',       'New Zealand'),
  ('Norway',            'Norway'),
  ('Panama',            'Panama'),
  ('Paraguay',          'Paraguay'),
  ('Portugal',          'Portugal'),
  ('Qatar',             'Qatar'),
  ('Saudi Arabia',      'Saudi Arabia'),
  ('Scotland',          'Scotland'),
  ('Senegal',           'Senegal'),
  ('South Africa',      'South Africa'),
  ('South Korea',       'Korea Republic'),
  ('South Korea',       'South Korea'),
  ('South Korea',       'Republic of Korea'),
  ('Spain',             'Spain'),
  ('Sweden',            'Sweden'),
  ('Switzerland',       'Switzerland'),
  ('Tunisia',           'Tunisia'),
  ('Turkey',            'Türkiye'),
  ('Turkey',            'Turkey'),
  ('United States',     'USA'),
  ('United States',     'United States'),
  ('United States',     'United States of America'),
  ('Uruguay',           'Uruguay'),
  ('Uzbekistan',        'Uzbekistan')
),

match_slots AS (
  SELECT id AS match_id, home_team AS stored_team FROM matches
  UNION ALL
  SELECT id AS match_id, away_team AS stored_team FROM matches
)

INSERT INTO odds_scorers (match_id, player_name, team, odds)
SELECT DISTINCT ms.match_id, p.player_name, ms.stored_team, p.odds
FROM players p
JOIN team_name_map tnm ON tnm.canonical = p.team
JOIN match_slots ms ON LOWER(ms.stored_team) = LOWER(tnm.variant)
WHERE NOT EXISTS (
  SELECT 1 FROM odds_scorers os
  WHERE os.match_id = ms.match_id
  AND os.player_name = p.player_name
);
