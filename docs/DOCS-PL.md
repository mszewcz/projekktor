# Projekktor 1.5.03

### Konfiguracja
Konfiguracja Projekktora dzieli się na trzy typy parametrów konfiguracyjnych:
* dotyczące całego playera
* dotyczące pojedyńczych elementów playlisty
* dotyczące poszczególnych pluginów

Przykładowo parametr `loop` dotyczy całego playera i definiuje się go w głównej części konfiguracji. Natomiast parametry takie jak `title` czy `poster` dotyczą konkretnego elementu aktualnie odtwarzanej playlisty i są definiowane właśnie na tym poziomie konfiguracji.

Przykładowa konfiguracja może więc wyglądać następująco:
```javascript
projekktor('#player',
// początek konfiguracji
{
    volume: 0.5, // parametry konfiguracyjne dotyczące całego playera
    loop: true,
    playlist: [
        {
            0: {src:'video.mp4', type:'video/mp4'},
            config:
            {
                title: 'wideo numer jeden', // parametry konfiguracyjne dotyczące pojedyńczego elementu playlisty
                poster: 'poster.jpg'
            }
        }
    ],
    plugin_tracking: {
        track: [ // parametry konfiguracyjne dotyczące pluginu tracking
                {cat:'videos', events: ["start"], url:"//tracking.server.net/track" }
            ]
    }
// koniec konfiguracji
);
```

Wszystkie parametry konfiguracyjne opisane poniżej mogą być ustawione podczas instancjacji playera. Parametry ustawione w ten sposób będą używane dla danej instancji [Projekktor]a i używane jako domyślne dla wszystkich elementów aktualnie odtwarzanej playlisty.

#### `playerName` [string][domyślnie: 'Projekktor']
Domyślna nazwa danej instancji playera wyświetlana np. w menu kontekstowym pluginu `contextmenu`.
#### `playerHome` [string][domyślnie: 'http://www.projekktor.com?via=context']
Domyślny adres URL danej instancji playera wyświetlany np. w menu kontekstowym pluginu `contextmenu`.
#### `cookieName` [string][domyślnie: 'projekktor']
Definiuje nazwę dla ciasteczka w którym player przechowuje preferencje oraz dane dla danego użytkownika playera.
#### `cookieExpiry` [int][domyślnie: 356]
Domyślna ilość dni przez które przechowywane będą dane zapisane w ciasteczku.
#### `plugins` [array]
domyślnie:
```
['display', 'controlbar', 'contextmenu', 'settings']
```

Lista pluginów, które mają zostać załadowane dla danej instancji playera. Kolejność w jakiej pluginy są ustawione w tablicy ma znaczenie ponieważ są one dodawane w DOM strony z kojenymi wartościami `z-index` od 0 do n. W tej sytuacji plugin `display` zazwyczaj powinien znajdować się na pierwszej pozycji.
#### `addplugins` [array][domyślnie: []]
Dodatkowa lista pluginów, która zostanie połączona z listą zdefiniowaną w parametrze `plugins`.
#### `ns` [string][domyślnie: 'pp']
Nazwa przestrzeni nazw (namespace) będąca prefiksem dołączanym do każdej nazwy klasy CSS elementów HTML playera oraz ich atrybutów `data-`. Wykorzystywane w celu zapobieżenia występowania potencjalnych konfliktów nazw.
#### `platforms` [array]
domyślnie:
```
['browser', 'android', 'ios', 'native', 'flash', 'silverlight']
```

Spriorytetyzowana lista platform, które mogą zostać wykorzystane do odtworzenia danej playlisty.

#### `platformsConfig` [object]
domyślnie:
```
{
flash: {
    src: ''
},
silverlight: {
    src: ''
}
```
Obiekt zawierający dodatkowe parametry konfiguracyjne specyficzne dla poszczególnych platform. Może zawierać ścieżkę do plików binarnych odtwarzaczy (swf, xap) oraz dodatkowe zmienne przekazywane bezpośrednio do nich (np. tzw. flashvars).

Przykładowa konfiguracja:
```
platformsConfig: {
       flash: {
           src: '/platforms/flash/StrobeMediaPlayback/StrobeMediaPlayback.swf',
           minPlatformVersion: '11.4',
           initVars: {
                plugin_hls: '/platforms/flash/StrobeMediaPlayback/plugins/flashls/flashlsOSMF.swf',
                hls_info: true, // parametry specyficzne dla pluginu flashls
                hls_warn: true,
                hls_error: true,
                hls_debug: true,
                hls_debug2: true,
                hls_minbufferlength: -1,
                hls_lowbufferlength: 2,
                hls_maxbufferlength: 60,
                hls_startfromlevel: -1,
                hls_seekfromlevel: -1,
                hls_live_flushurlcache: false,
                hls_seekmode: 'ACCURATE',
                hls_manifestloadmaxretry: 3,
                hls_keyloadmaxretry: 3,
                hls_fragmentloadmaxretry: 3,
                hls_capleveltostage: true,
                hls_maxlevelcappingmode: 'downscale'
           }
       },
       silverlight: {
           src: '/platforms/silverlight/mediaelement/silverlightmediaelement.xap',
           initVars: {
               debug: 'false'
           }
       }
```

#### `platformsFullscreenConfig` [object]
domyślnie:
```
{
    browser: ['full', 'viewport'],
    native: ['full', 'mediaonly', 'viewport'],
    android: ['full', 'mediaonly', 'viewport'],
    ios: ['full', 'mediaonly', 'viewport'],
    flash: ['full', 'viewport'],
    silverlight: ['full', 'viewport']
}
```
Obiekt konfiguracyjny dla trybów wyświetlania pełnoekranowego dla poszczególnych platform. Każdej dostępnej platformie można przypisać spriorytetyzowaną tablicę trybów wyświetlania pełnoekranowego. Więcej na temat wyświetlania pełnoekranowego [tutaj]

#### `iframe` [boolean][domyślnie: false]
Parametr określający czy player będzie znajdował się w środowisku elementu `<iframe>` i ma dostosować swoje zachowanie do tego kontekstu, czy też nie. W przypadku gdy parametr jest ustawiony na `true` wówczas player domyślnie przy uruchomieniu wypełnia całą przestrzeń dostępną dla danego okna ramki przeglądarki (`window`), zmienia się również zachowanie w kontekście przechodzenia w tryb pełnoekranowy, które wymaga określenia atrybutu `allowfullscreen` dla elementu `<iframe>`.

#### `ignoreAttributes` [boolean][domyślnie: false]
W przypadku gdy player jest wstępnie inicjowany z elementu `<video>` bądź `<audio>` wówczas domyślnie odczytywane są atrybuty ustawione w tym elemencie a wartości z nich pozyskane nadpisują wartości zdefiniowane w konfiguracji za pośrednictwem obiektu JavaScript. Natomiast jeśli parametr `ignoreAttributes` zostanie ustawiony na `true` atrybuty te zostaną zignorowane a player będzie wykorzystywał wyłącznie konfigurację podaną w obiekcie JavaScript. Atrybuty, które są odczytywane to: `autoplay`, `controls`, `muted`, `loop`, `title`, `poster`, `width`, `height`.

#### `loop` [boolean][domyślnie: false]
W przypadku gdy wartość ta jest ustawiona na `true` wówczas skonfigurowana playlista będzie odtwarzana w pętli, aż do ręcznego zatrzymania odtwarzania przez użytkownika. W przeciwnym wypadku playlista zostanie odtworzona wyłącznie raz, a następnie player przejdzie w stan bezczynności w którym wyświetla zdefiniowany w parametrze `poster` obrazek.

#### `autoplay` [boolean][domyślnie: false]
Gdy wartość ustawiona na `true` player automatycznie rozpocznie odtwarzanie materiału wideo tak szybko jak tylko to możliwe. Należy zwrócić uwagę, że funkcjonalność ta nie jest dostępna na większości urządzeń mobilnych.

#### `continuous` [boolean][domyślnie: true]
W przypadku gdy na playliście playera znajduje się więcej niż 1 pozycja domyślnie po zakończeniu odtwarzania danej pozycji następuje automatyczne przejście do odtwarzania kolejnej zdefiniowanej pozycji tej playlisty bez wymaganej ingerencji użytkownika. Jeśli jednak parametr ten zostanie ustawiony na `false` player po zakończeniu danej pozycji playlisty przejdzie do kolejnej pozycji, jednak nie rozpocznie automatycznie jej odtwarzania. Rozpoczęcie odtwarzania kolejnej pozycji wymaga wówczas ingerencji użytkownika.

#### `thereCanBeOnlyOne` [boolean][domyślnie: false]
Domyślnie w ramach danego okna (`window`) może być odtwarzanych symultanicznie wiele materiałów wideo w oddzielnych instancjach playera. W przypadku gdy parametr ten zostanie jednak ustawiony na `true` w kontekście jednego okna (`window`) będzie możliwe odtwarzanie wyłącznie jednego materiału wideo, pozostałe znajdujące się na stronie materiały wideo zostaną zatrzymane.

#### `playlist` [array][domyślnie: []]
Tablica zawierająca obiekty zgodne ze schematem określonym dla playlisty playera. To tutaj definiowane są materiały audio/video, które mają być odtworzone. Więcej na temat playlisty i jej definiowania [tutaj].

#### `debug` [boolean][domyślnie: false]
Ustawienie tego parametru na `true` powoduje uruchomienie playera w trybie debugowania. Daje to możliwość podglądu szczegółowych logów playera w konsoli przeglądarki.

#### `width` [mixed][domyślnie: null]
Szerokość playera w pikselach. Domyślnie ustawiona wartość `null` powoduje, że player dostosuje swoją szerokość do szerokości elementu kontenera w którym aktualnie się znajduje.

#### `height` [mixed][domyślnie: false]
Wysokość playera w pikselach. Domyślnie ustawiona wartość `null` powoduje, że player dostosuje swoją wysokość do wysokości elementu kontenera w którym aktualnie się znajduje.

#### `keys`  [array]
domyślnie:
```
[{
    27: function(player) {player.setFullscreen(false)}, // esc
    32: function(player, evt) {player.setPlayPause(); evt.preventDefault();}, // space
    70: function(player) {player.setFullscreen(true)}, // f
    39: function(player, evt) {player.setPlayhead('+5'); evt.preventDefault();}, // left
    37: function(player, evt) {player.setPlayhead('-5'); evt.preventDefault();}, // right
    38: function(player, evt) {player.setVolume('+0.05'); evt.preventDefault();}, // up
    40: function(player, evt) {player.setVolume('-0.05'); evt.preventDefault();}, // down
    68: function(player) {player.setDebug();}, // D
    67: function(player) {$p.utils.log('Config Dump', player.config);}, // C,
    88: function(player) {$p.utils.log('Playlist Dump', player.getItem());}, // X
    89: function(player) {$p.utils.log('Current Quality', player.getAppropriateQuality());} // Y
}]
```
Tablica zawierająca obiekty zawiarające pary kod_klawisza->funkcja w celu skonfigurowania skrótów klawiaturowych pozwalających na sterowanie poszczególnymi funkcjami playera. Aby dany skrót klawiaturowy zadziałał na dany player musi zostać ustawiony focus (np. poprzez najechanie kursorem myszy nad jego obszar).

Dla danego kodu klawisza można skonfigurować więcej niż jedną akcję. Np.:
```
[
 {32: function(player) {player.setPlayPause();}},
 {32: function(player) {console.log("Użytkownik nacisnął spację");}}
]
```

#### `leaveFullscreen`  [boolean][domyślnie: true]
W przypadku gdy `true` player będzie się starał opuścić tryb pełnoekranowy po zakończeniu odtwarzania danej playlisty. W przeciwnym wypadku player pozostanie w trybie pełnoekranowym do czasu gdy użytkownik manualnie nie wyjdzie z tego trybu (np. naciskając klawisz Esc).

#### `fullscreen` [array][domyślnie: ['full', 'mediaonly', 'viewport']]
Tablica zawierająca spriorytetyzowaną listę trybów wyświetlania pełnoekranowego. Dostępne tryby to:
- full - używa HTML5 fullscreen API jeśli jest dostępne - w tym trybie player będzie wyświetlał wszystkie swoje kontrolki oraz overlaye w trybie pełnoekranowym bez zakłóceń.
- mediaonly - w tym trybie player będzie korzystał z natywnego interfejsu odtwarzacza wideo dostępnego na danym urządzeniu, bądź też korzystał z domyślnego interfejsu elementu `<video>` w trybie pełnoekranowym. Kontrolki playera (oraz ich styl) oraz overlaye nie będą wyświetlane.
- viewport - ten tryb to tzw. 'pseudo fullscreen', gdyż player spróbuje powiększyć swoje rozmiary do maksimum dostępnego dla danego okna (`window`) przeglądarki. W ten sposób obszar playera przykryje inne elementy współwystępujące z nim na danej stronie, jednak pasek adresu oraz kontrolki interfejsu przeglądarki internetowej nie zostaną ukryte. W tym trybie player zachowuje zdefiniowany w stylach wygląd jak również wyświetla warstwy overlay nad obrazem wideo.

Jeśli tablica jest pusta `[]` bądź też ustawiona na wartość `null` wówczas możliwość przejścia w tryb pełnoekranowy dla danego playera zostanie wyłączona. Jeśli preferowaną opcją jest wyświetlenie kontolek playera w zdefinowanym stylu oraz warstw overlay pomimo, że dostępny jest natywny tryb fullscreen dla elementu `<video>` (jak ma to miejsce przykładowo na iPadach) należy umieścić w tablicy konfiguracyjnej wartość `viewport` przed `mediaonly`, np: `['full', 'viewport', 'mediaonly']`.

### Parametry konfiguracyjne dotyczące poszczególnych elementów playlisty
Te parametry mogą być różne dla poszczególnych elementów playlisty.

#### `id` [string][domyślnie: wartość losowa]
Unikalne ID identyfikujące w jednoznaczny sposób pozycję playlisty. Wykorzystywane głównie na potrzeby wewnętrzne playera. Jeśli nie zostanie podane arbitralnie, zostanie wygenerowane automatycznie.

#### `title` [string][domyślnie: null]
Tytuł dla danej pozycji playlisty. Będzie on wyświetlany np. na panelu kontrolnym (jeśl zostanie to zdefiniowane).

#### `cat` [string][domyślnie: 'clip']
Kategoria do której ma należeć dana pozycja playlisty. Dzięki temu można w łatwy sposób odróżnić np. reklamy od materiałów redakcyjnych.

#### `duration` [number][domyślnie: 0]
Długość danej pozycji playlisty w sekundach. Parametr ten jest wykorzystywany głównie dla pozycji playlisty będących obrazkami, wtedy skonfigurowana wartość będzie uzawana jako czas przez który ma być dany obrazek wyświetlany. W przypadku materiałów audio/wideo natomiast, podana wartość będzie wykorzystana do wyświetlenia np. na pasku kontrolnym. Tak szybko jednak jak tylko player otrzyma informację z metadanych danego materiału audio/wideo na temat rzeczywistej długości tego materiału, wartość ustawiona w parametrze zostanie nadpisana przez wartość pobraną z metadanych.

#### `poster` [string][domyślnie: null]
URL do obrazka, który ma być wyświetlany jako zaślepka przed odtworzeniem danego materiału wideo.

#### `volume` [number][domyślnie: 0.8]
Początkowa głośność odtwarzania mieszcząca się w przedziale 0 (wyciszony) do 1 (maksymalna głośność). W przypadku gdy użytkownik zmienił wcześniej głośność odtwarzania wg własnej preferencji to wartość ta zostanie zignorowana, chyba że jednocześnie na `true` zostanie ustawiony parametr `fixedVolume`.

#### `fixedVolume` [boolean][domyślnie: false]
Włącza/wyłącza możliwość zmiany głośności danej pozycji playlisty z poziomu interfejsu użytkownika. Nie wpływa na możliwość zmiany poziomu głośności wykorzystując polecenia API JS.

#### `forceMuted`[boolean][domyślnie: false]
Wymusza rozpoczęcie odtwarzania danego elementu playlisty w trybie wyciszenia. Użytkownik może włączyć głos wykorzystując w tym celu interfejs użytkownika, chyba że jednocześnie na `true` zostanie ustawiony parametr `fixedVolume`.

#### `disablePause` [boolean][domyślnie: false]
Włącza/wyłącza możliwość pauzowania danej pozycji playlisty z poziomu interfejsu użytkownika. Nie wpływa na pauzowanie z poziomu API JS.

#### `disallowSkip` [boolean][domyślnie: false]
Włącza/wyłącza możliwość pominięcia i/lub przewijania danej pozycji playlisty z poziomu interfejsu użytkownika. Nie wpływa na możliwość przewijania i/lub przechodzenie do innego elementu playlisty w trakcie jej odtwarzania wykorzystując polecenia API JS.

#### `imageScaling` [string][domyślnie: 'aspectratio']
Tryb skalowania obrazków (np. obrazka wykorzystywanego jako poster). Dostępne tryby:
* `fill` - obraz będzie skalowany bez zachowania oryginalnych proporcji tak aby wypełnić cały aktualny obszar playera
* `aspectratio` - obraz będzie skalowany z zachowaniem oryginalnych próbując wypełnić jak największy obszar playera. W niektórych sytuacjach będzie to powodowało powstawanie pustych pasów powyżej/poniżej lub po bokach obrazu.
* `none` - obraz nie będzie skalowany a jedynie zostanie wycentrowany. Może to powodować powstawanie pustych obszarów wokół obrazu.

#### `videoScaling` [string][domyślnie: 'aspectratio']
Tryb skalowania materiałów wideo. Dostępne tryby jak w przypadku parametru `imageScaling`. Niektóre tryby skalowania nie są dostępne dla niektórych platform.

#### `enableKeyboard`
Włącza/wyłącza możliwość korzystania ze skrótów klawiaturowych zdefiniowanych w parametrze `keys`.

#### `enableTestcard` [boolean][domyślnie: true]
Włącza/wyłącza wyświetlanie plansz z komunikatami o błędach.

#### `skipTestcard` [boolean][domyślnie: false]
W przypadku gdy na playliście znajduje się więcej niż jedna pozycja i dla danej pozycji wystąpi błąd odtwarzania, domyślnie, player w przypadku parametru `enableTestcard` ustawionego na `true` zatrzyma się aby wyświetlić użytkownikowi planszę z opisem błędu, który wystąpił. W przypadku ustawienia tego parametru na `true` plansza z opisem błędu nie zostanie wyświetlona i player podejmie próbę odtworzenia kolejnej pozycji playlisty.

#### `playbackQuality` [string][domyślnie: 'auto']
Nazwa jakości, zdefiniowanej w ramach `playbackQualities`, która ma być odtwarzana jako domyślna. W przypadku streamów adaptatywnych (dynamicznych), nazwa ta musi być zgodna z szablonem określonym w parametrach `dynamicStreamQualityKeyFormatAudioVideo` lub `dynamicStreamQualityKeyFormatAudioOnly`. Wartość `auto` powoduje, że player sam wybiera optymalną jakość w danym kontekście.

#### `playbackQualities` [array][domyślnie: []]
Tablica zawierająca obiekty definiujące poszczególne jakości dla danej pozycji playlisty. Przykładowo:
```
{key: 'small',  minHeight: 240,  minWidth: 240},
{key: 'medium',  minHeight: 360,  minWidth: [{ratio: 1.77, minWidth: 640}, {ratio: 1.33, minWidth: 480}]},
{key: 'large',  minHeight: 480,  minWidth: [{ratio: 1.77, minWidth: 853}, {ratio: 1.33, minWidth: 640}]},
{key: 'hd1080',  minHeight: 1080, minWidth: [{ratio: 1.77, minWidth: 1920}, {ratio: 1.33, minWidth: 1440}]},
{key: 'hd720',  minHeight: 720,  minWidth: [{ratio: 1.77, minWidth: 1280}, {ratio: 1.33, minWidth: 960}]},
{key: 'highres',  minHeight: 1081, minWidth: 0}  
```
Więcej na temat konfigurowania poszczególnych jakości oraz mechanizmów zmiany jakości [tutaj].

#### `dynamicStreamQualityKeyFormatAudioVideo` [string][domyślnie: '%{height}p | %{bitrate}%{bitrateunit}']
Format nazwy dla adaptatywnych streamów (np. HDS, HLS, MSS, MPEG-DASH etc.) zawierających dane audio jak i wideo. Wygenerowane na podstawie tego schematu nazwy będą wyświetlane menu wyboru jakości.

Dostępne zmienne, które można wykorzystać w ramach szablonu to:
* %{width} - szerokość wideo w px
* %{height} - wysokość wideo w px
* %{bitrate} - bitrate w kbps lub Mbps
* %{bitrateunit} - kbps lub Mbps
* %{bitratekbps} - bitrate w kbps
* %{bitratembps} - bitrate w Mbps

#### `dynamicStreamQualityKeyFormatAudioOnly` [string][domyślnie: '%audio | %{bitrate}%{bitrateunit}']
Format nazwy dla adaptatywnych streamów (np. HDS, HLS, MSS, MPEG-DASH etc.) zawierających wyłącznie dane audio. Wygenerowane na podstawie tego schematu nazwy będą wyświetlane menu wyboru jakości.

Dostępne zmienne, które można wykorzystać w ramach szablonu to:
* %{bitrate} - bitrate w kbps lub Mbps
* %{bitrateunit} - kbps lub Mbps
* %{bitratekbps} - bitrate w kbps
* %{bitratembps} - bitrate w Mbps

Jakości streamów zawierające wyłącznie dźwięk pojawią się w menu wyboru jakości wyłącznie gdy parametr `dynamicStreamShowAudioOnlyQualities` zostanie ustawiony na `true`.

#### `dynamicStreamShowAudioOnlyQualities` [boolean][domyślnie: false]
Włącza/wyłącza wyświetlanie w menu wyboru jakości streamy zawierające wyłacznie dźwięk (bez obrazu).

#### `dynamicStreamQualityKeyBitrateRoundingDecimalPlacesCount` [number][domyślnie: 1]
Parametr określający ilość miejsc dziesiętnych wyświetlanych w ramach nazwy jakości z użyciem zmiennych: `%{bitrate}`, `%{bitratekbps}`, %{bitratembps}.

#### `rtmpUrlIncludesApplicationInstance` [boolean][domyślnie: false]
Dla materiałów RTMP wskazuje na to, czy dany URL zawiera w sobie część określającą instancję aplikacji. Jeśli `true` wówczas druga część URLa jest uznawana za nazwę danej instancji. Przykładowo dla adresu `rtmp://host/app/foo/bar/stream` nazwą instancji będzie `foo` a nazwą streama będzie `bar/stream`. Natomiast gdy parametr ten zostanie ustawiony na `false` wtedy w powyższym przykładzie całość adresu jest uznawana za nazwę streama (`foo/bar/stream`), brak natomiast nazwy instancji.

### Modele i platformy

#### Modele
#### NA
#### Image
#### Playlist
#### Audio Video Native
#### Audio Video Native HLS
#### Audio Video OSMF
#### Audio Video OSMF HLS
#### Audio Video OSMF MSS
#### Audio Video Silverlight

### Platformy

#### ANDROID
#### BROWSER
#### FLASH
#### IOS
#### NATIVE
#### SILVERLIGHT

### Plugins

## JavaScript API
API JavaScript umożliwia kontrolę nad wszystkimi funkcjami playera z poziomu skryptów JavaScript. Pozwala to na pisanie własnych rozszerzeń dla playera oraz prostych zewnętrznych skryptów nie przejmując się w większości przypadków o wewnętrzne zawiłości mechanizmów działania playera.

### Instancjacja
W ramach kontekstu jednego dokumentu HTML może funkcjonować wiele niezależnych instancji playera. Do utworzenia oraz selekcji poszczególnych instancji wykorzystujemy globalną funkcję `projekktor`, która zwraca referencję do nowoutworzonej lub istniejącej już instancji playera.

#### `projekktor`
```
projekktor(selektor:String, config:Object, onReady:Function):Object
```

Gdzie:
##### `selektor`
Selektor zgodny z definicją [jQuery selectors].

##### `config`
Obiekt konfiguracyjny zgodny ze schematem opisanym w sekcji [Konfiguracja](#Konfiguracja)

##### `onReady(pp:Object)`
Funkcja, która zostanie wywołana zaraz po zakończeniu inicjalizacji playera. Jako argument funkcji zostaje przekazany obiekt aktualnej instancji playera.

#### Tworzenie instancji playera
Aby utworzyć nową instancję playera należy wywołać funkcję `projekktor` wraz z właściwie zdefiniowanym selektorem odpowiadającym:
* `ID` elementu znajdującego się w DOM dokumentu, w którym to zostanie umieszczona ta konkretna instancja playera. Przykładowo:
```javascript
// JavaScript
projekktor('#player');
```
```html
<div id='player'>
</div>
```
* Nazwie elementu typu `MediaElement` (`<video>`, `<audio>`)
```javascript
// JavaScript
projekktor('video');
```
```html
<video id='player' src='video.mp4'>
```
W tym przypadku player zostanie zainicjalizowany dla wszystkich elementów `<video>` znajdujących się w DOM strony.

#### Pobieranie instancji playera
Aby pobrać instancję playera w celu wykonania na niej manipulacji należy wywołać funkcję `projekktor` podać jako pierwszy argument selektor odpowiadający `ID` danego playera. Np.:
```javascript
var p = projekktor('#player');
p.setPlay();
```

Można również pobrać wszystkie instancje playera korzystając z specjalnego uniwersalnego identyfikatora (wildcard) `*`.
```javascript
var p = projekktor('*');
```

W przypadku gdy zamierzamy kontrolować dane instancje playera przy pomocy JavaScript API najwygodniej jest ustalić unikalny i znany nam identyfikator dla każdej z instancji. Jeśli tego nie zrobimy wówczas identyfikator zostanie ustawiony na 8 znakowy losowy ciąg znaków co praktycznie uniemożliwia selekcję konkretnej instancji playera i dalesze na nim działania. Oczywiście można skorzystać z ww. uniwersalnego identyfikatora ('*') i pobrać wszystkie dostępne instancje playera, jednak zmniejsza to znacząco precyzję pracy z instancjami playera.

[jQuery selectors]: https://api.jquery.com/category/selectors/

### Metody
Metody dzielimy na:
* `settery` - służące do wprowadzania zmian do aktualnego zachowania playera i ewentualne pobranie danych dotyczących tej zmiany
* `gettery` - służące co pobierania danych na temat aktualnego stanu playera bez wprowadzania zmian do jego zachowania

Wszystkie metody są wykonywane bezpośrednio na konkretnej instancji playera. Przykładowo:
```javascript
var p = projekktor('#player');
p.setPlay();
```

Można również wykonać daną metodę bez wczesniejszego definiowania zmiennej do której ma być przypisana dana instancja playera, np.:
```javascript
projekktor('#player').setPlay();
```
Jednak tego typu zapis przydaje się głównie w przypadku gdy chcemy szybko wykonać wyłącznie jedną funkcję API na danej instancji playera. W przypadku gdy chcemy wykonać wiele funkcji optymalniejszy jest pierwszy podany zapis.

#### Settery
##### `addListener`
```javascript
addListener(event:String, callback:Object):null
```
Dodaje funkcję określoną w parametrze `callback` jako listener dla [eventu]:(#Komunikaty_(eventy)) określonego w parametrze `event`.

##### `removeListener`
```javascript
removeListener(event:String, callback:Object):Boolean
```
Usuwa wcześniej ustawionego przy pomocy funkcji `addListener` listenera. Funkcja `callback` musi być tą samą funkcją, która wcześniej została dodana przy pomocy `addListener`. Np.:
```javascript
var p = projekktor('#player'),
onDone = function(pp){
    console.log(pp.getState());
};
// prawidłowe dodanie funkcji listenera
p.addListener('done', onDone);

// prawidłowe usunięcie funkcji listenera
p.removeListener('done', onDone);
```
W przypadku gdy funkcja listenera zostanie prawidłowo usunięta, funkcja `removeListener` zwraca wartość `true` w przeciwnym wypadku `false`.

##### `setFile`
```javascript
setFile(data:Mixed, type:String):null
```
Ustawia pojedyńczy element bądź całą playlistę dla playera. Funkcja ta nadpisuje aktualnie zdefiniowaną playlistę.
* `data` - może być zarówno adresem URL jak również prawidłowo zdefiniowanem obiektem playlisty. Jeśli URL nie jest określony jako prowadzący do dynamicznie pobieralnej (AJAX) playlisty w formacie XML, JSON lub JSONP wówczas dany URL jest traktowany jako wskazujący na pojedyńczy plik audio/video.

##### `setItem`
```javascript
setItem(data:Mixed, index:Number, replace:Boolean):null
```
Dodaje/usuwa/zamienia elementy wczytanej już playlisty.

##### `setConfig`
```javascript
setConfig(data:Object, destIndex:Mixed):null
```

Umożliwia zmianę konfiguracji playera już po jego inicjalizacji.
* `data` - obiekt konfiguracyjny zawierający jednen lub więcej parametrów konfiguracyjnych
* `destItem` - indeks obiektu playlisty do którego ma zostać zmieniona konfiguracja. Jeśli ma zostać zmieniona dla wszystkich pozycji playlisty należy użyć '*'.  W przypadku gdy parametr zostanie pominęty bądź ustawiony na wartość `null` zmiana konfiguracji odnosi się do aktualnie ustawionej pozycji playlisty.

Zmiany konfiguracji dla aktualnej pozycji playlisty mają efekt wyłącznie w momencie gdy status playera to `IDLE` (czyli nie jest w trakcie odtwarzania).

##### `setPlayhead`
```javascript
setPlayhead(position:Mixed):null
```

Umożliwia skok do podanej pozycji na lini czasu aktualnie odtwarzanego materiału.

* `position` - parametr może przyjąć wartość absolutną w sekundach bądź też relatywną poprzedzoną operatorami "+" lub "-" determinującymi kierunek skoku.

##### `setVolume`
```javascript
setVolume(vol:Mixed):null
```
Umożliwia zmianę poziomu głośności.

* `vol` - parametr może być albo numeryczny reprezentuje wtedy wartość absolutną z przedziału (0-100) albo relatywną poprzedzoną operatorami "+" lub "-" determinującymi czy głośność ma być zwiększona czy też zmniejszona i o jaką wartość względem aktualnie ustawionej.

##### `setFullscreen`
```javascript
setFullscreen(goFullscreen:Boolean):null
```
Umożliwia wejście/wyjście playera do/z trybu pełnoekranowego.

##### `setSize`
```javascript
setSize({width:<x>, height:<y>}):Boolean
```
Umożliwia zmianę rozmiarów playera już po jego inicjalizacji.

##### `setPlayPause`
```javascript
setPlayPause():Boolean
```
Przełącza playera w tryb odtwarzania gdy jest zpauzowany oraz vice versa.

##### `setPlay`
```javascript
setPlay():Boolean
```
Rozpoczyna odtwarzanie aktualnego elementu playlisty.

##### `setPause`
```javascript
setPause():Boolean
```
Zatrzymuje odtwarzanie aktualnego elementu playlisty.

##### `setStop`
```javascript
setStop():Boolean
```
Zatrzymuje odtwarzanie aktualnego elementu playlisty. Przechodzi do pierwszego elementu playlisty i ustawia go jako aktualny. Ustawia playera w tryb `IDLE` oraz wyświetla zdefiniowany poster.

##### `setActiveItem`
```javascript
setActiveItem(item:Mixed):null
```
Inicjalizuje odtwarzanie elementu playlisty o podanym indeksie.

* `item` - parametr może przyjmować wartość numeryczną wskazującą na indeks elementu znajdującego się na aktualnie załadowanej playliście, bądź też przyjąć wartość: 'next'/'previous' co spowoduje przejście do następnego bądź poprzedniego elementu playlisty.

##### `setCuePoint`
```javascript
setCuePoint(cuePoint:Object):null
```

Dodaje cuepointa. Funkcjonalność cuepointów opisana została [tutaj].

##### `removeCuePoint`
```javascript
removeCuePoint(group:String, idx:number):null
```
Usuwa cuepointa.

##### `setPlaybackQuality`
```javascript
setPlaybackQuality(quality:String):this
```
Ustawia jakość odtwarzanego aktualnie materiału na tę określoną w parametrze `quality`. Identyfikator jakości musi się zgadzać z nazwą zdefiniowaną w ramach parametru konfiguracyjnego `playbackQualities`.

##### `selfDestruct`
```javascript
selfDestruct():null
```
Niszczy instancję playera i odtwarza stan sprzed inicjalizacji playera. Przywrócony zostaje element, który wcześniej ostał zastąpiony playerem w trakcie inicjalizacji.

##### `reset`
```javascript
reset():null
```
Resetuje stan playera zachowując aktualną konfigurację. Ustawia playera na pierwszą pozycję playlisty.

##### `openUrl`
```javascript
openUrl(Object:{url:String, target:String, pause:Boolean}):null
```
Otwiera podany URL w ustawionym w parametrze `target` oknie. Opcjonalnie może również zapauzować odtwarzanie.

#### Getters
##### `getItemCount`
```javascript
getItemCount():Number
```
Zwraca aktualną ilość elementów playlisty.

##### `getVolume`
```javascript
getVolume():Number
```
Zwraca aktualną wartość głośności.

##### `getItemIdx`
```javascript
getItemIdx():Number
```
Zwraca indeks elementu playlisty, który jest aktualnie odtwarzany bądź ma być odtwarzany.

##### `getItemId`
```javascript
getItemId():String
```
Zwraca indeks elementu playlisty, który jest aktualnie odtwarzany bądź ma być odtwarzany.

##### `getItem`
```javascript
getItem(idx:Mixed):Array
```
Zwraca jeden lub więcej elementów playlisty.
* `idx` - może przyjąć wartość numeryczną (wtedy zwrócony zostanie element playlisty znajdujący się na podanej w parametrze pozycji) lub jedną z poniższych wartości:
** `next` - zwróci następną pozycję playlisty
** `current` - zwróci aktualną pozycję playlisty
** `previous` - zwróci poprzednią pozycję playlisty
** `*` - zwraca wszystkie pozycje playlisty (analogicznie do wywołania funkcji `getPlaylist`)

##### `getLoadProgress`
```javascript
getLoadProgress(idx:Mixed):Number
```
Zwraca aktualny procent załadowania danego materiału (0-100). Jeśli dany materiał jest streamem możliwym do losowego przewijania wartość ta jest zawsze równa 100.

##### `getCuePoints`
```javascript
getCuePoints(idx:Number):Array
```
Zwraca wszystkie cuepointy zdefiniowane dla określonego w parametrze `idx` elementu playlisty.

##### `getPosition`
```javascript
getPosition():Number
```
Zwraca aktualną pozycję odtwarzania aktualnego elementu playlisty.

##### `getDuration`
```javascript
getDuration():Number
```
Zwraca czałkowity czas trwania aktualnego elementu playlisty.

##### `getTimeLeft`
```javascript
getTimeLeft():Number
```
Zwraca ilość czasu pozostałą do końca aktualnego elementu playlisty. Różnica między całkowitym czasem trwania oraz aktualną pozycją odtwarzania aktualnego elementu playlisty.

##### `getIsFullscreen`
```javascript
getIsFullscreen():Boolean
```
Zwraca `true` gdy player jest w trybie pełnoekranowym lub `false` w przeciwnym wypadku.

##### `getPublicName`
```javascript
getPublicName():String
```
Zwraca ID elementu DOM w którym znajduje się player.

##### `getMediaType`
```javascript
getMediaType():String
```
Zwraca typ aktualnie odtwwarzanego elementu playlisty.

##### `getCanPlay`
```javascript
getCanPlay(type:String, platform:String):Boolean
```
Zwraca `true` jeśli player ma możliwość odtworzenia materiału o określonym typie.

##### `getIframeWindow`
```javascript
getIframeWindow():JQueryObject
```
Jeśli player jest w elemencie <iframe> wówczas funkcja zwraca referencję do okna rodzica danego elementu <iframe>

##### `getIframe`
```javascript
getIframe():JQueryObject
```
Jeśli player jest w elemencie <iframe> wówczas funkcja zwraca referencję do obiektu <iframe> w którym znajduje się player.

##### `getPlaylist`
```javascript
getPlaylist():Array
```
Zwraca całą aktualnie załadowaną playlistę.

##### `getState`
```javascript
getState(test:String):Mixed
```
Jeśli funkcja wywołana zostaje bez parametru wówczas zwraca aktualny status playera. Jeśli parametr `test` jest ustawiony na jeden z możliwych stanów playera to wówczas zwraca wartość `true` lub `false` w zaleśności czy aktualny stan playera jest zgodny z tym ustawionym w parametrze `test`.

### Komunikaty (eventy)
Poniżej opisane komunikaty są wykorzystywane przez wewnętrzne mechanizmy playera, jak również mogą być podpięte pod zewnętrzne skrypty z wykorzystaniem API JS (`addListener`) i/lub w ramach pluginów. Niektóre eventy mogą zwracać jako parametr dodatkowe dane skorelowane z eventem, który wystąpił. Inne natomiast takich danych nie zwracają (zwracają wtedy wartość `null`).

#### `scheduleLoading` [null]
Rozpoczęto ładowanie playlisty.

#### `scheduleModified` [null]
Playlista została zmodyfikowana (dodano, usunięto, przesunięto z niej elementy).

#### `scheduled` [null]
Playlista została poprawnie załadowana i jest gotowa do odtwarzania.

#### `configModified` [null]
Konfiguracja playera została zmodyfikowana.

#### `item` [number]
Rozpoczęto wczytywanie kolejnej pozycji playlisty (czyli tej która jest aktualna). Indeks danej pozycji zwracany jest jako parametr eventu.

#### `displayReady` [null]
Ukończono inicjalizację elementu odpowiedzialnego za odtwarzanie danej pozycji playlisty.

#### `pluginsReady` [null]
Ukończono inicjalizację wszystkich załadowanych pluginów playera.

#### `ready` [null]
Player jest gotowy do odtworzenia aktualnej pozycji playlisty. Następuje to zawsze po wystąpieniu eventów `displayReady` oraz `pluginsReady`. W zależności od konfiguracji `autostart` oraz `continuous` może to oznaczać przejście playera do stanu (state) `IDLE` bądź `PLAYING`.

#### `start` [null]
Odtwarzanie zostało rozpoczęte i pierwsza klatka materiału wideo została wyświetlona.

#### `state` [string]
Player zmienił stan w którym się znajduje.

Występują następujące stany:

##### `IDLE`
Player oczekuje na działanie użytkownika i nie rozpoczął jeszcze odtwarzania. W tym stanie najczęściej pokazywany jest obrazek zdefiniowany w konfiguracji jako `poster` dla danej pozycji playlisty.

##### `AWAKENING`
Player rozpoczął inicjalizację modelu mającego być wykorzystanym do odtworzenia aktualnej pozycji playlisty. Przejście do tego stanu może nastąpić w wyniku działania użytkownika (np. kliknięcie w przycisk play) bądź automatycznie w przypadku gdy parametr konfiguracyjny `autoplay` dla tej pozycji playlisty został ustawiony na `true`.

##### `STARTING`
Nastąpiło pomyślne zainicjalizowane modelu odtwarzania i za chwilę powinno nastąpić odtwarzanie aktualnej pozycji playlisty.

##### `PLAYING`
Player jest w trakcie odtwarzania aktualnej pozycji playlisty.  

##### `PAUSED`
Odtwarzanie aktualnej pozycji playlity zostało wstrzymane.

##### `STOPPED`
Odtwarzanie aktualnej pozycji playlisty zostało zatrzymane na skutek działań użytkownika, bądź zamknięcia okna przeglądarki.

##### `COMPLETED`
Odtwarzanie aktualnej pozycji palylisty zostało zakończone.

##### `ERROR`
Wystąpił błąd.

##### `DESTROYING`
Model wykorzystany do odtworzenia aktualnej pozycji playlisty rozpoczyna proces autodestrukcji.

#### `buffer` [string]
Event występuje w momencie zmiany stanu bufora modelu w ramach, którego odtwarzana jest aktualna pozycja playlisty.

Możliwe są dwa stany bufora:
##### `EMPTY`
Bufor jest pusty, bądź danych jest zbyt mało aby kontynuować odtwarzanie. Player wstrzymał odtwarzanie i stara się zbuforować dane potrzebne do jego wznowienia.

##### `FULL`
W buforze znajduje się wystarczająca ilość danych aby móc odtwarzać aktualną pozycję playlisty.

#### `seek` [string]

##### `SEEKING`
##### `SEEKED`

#### `volume` [number]
Została zmieniona głośność.

#### `mute` [boolean]
Player przeszedł w tryb wyciszenia

#### `resume` [null]
Nastąpiło wznowienie odtwarzania danej pozycji playlisty, która wcześniej została spauzowana - player przeszedł ze stanu `PAUSED` do stanu `PLAYING`.

#### `time` [number]
Nastapiła zmiana pozycji odtwarzanego materiału. Odpalany w interwałach nie krótszych niż 500ms.

#### `progress` [number]
Event odpalany w momencie gdy został załadowany kolejny fragment materiału ładowanego progresywnie (jednak w interwałach nie krótszych niż 500ms). Event przestaje być odpalany gdy dany materiał zostanie całkowicie załadowany bądź też jest możliwy do losowego przewijania (np. jest to stream adaptatywny: HLS, MSS etc. lub przeglądarka i serwer są w stanie obsłużyć nagłówki HTTP/1.1 Range).

#### `firstquartile` [null]
Został przekroczony punkt 1/4 całkowitej długości aktualnie odtwarzanego materiału.

#### `midpoint` [null]
Została przekroczona połowa całkowitej długości aktualnie odtwarzanego materiału.

#### `thirdquartile` [null]
Został przekroczony punkt 3/4 całkowitej długości aktualnie odtwarzanego materiału.

#### `fullscreen` [boolean]
Player wszedł/wyszedł z trybu pełnoekranowego.

#### `resize` [null]
Rozmiar okna dokumentu w którym znajduje się player (bądź też samego playera) uległ zmianie.

#### `scale` [null]
Aktualnie wyświetlany materiał został zeskalowany aby dopasować się do aktualnych rozmiarów playera.

#### `qualityChange` [null]
Nastąpiła zmiana jakości aktualnie odtwarzanej pozycji playlisty.

#### `deatach` [null]
Model, który był wykorzystywany do odtwarzania aktualnej pozycji playlisty został skutecznie usunięty.

#### `mousemove` [null]
Wskaźnik myszy przesunął się nad obszarem playera.

#### `mousedown` [ClickEvent]
Nastąpiło wciśnięcie klawisza myszy nad obszarem playera.

#### `mouseleave` [MouseEvent]
Wskaźnik myszy opuścił obszar zajmowany przez playera.

#### `key` [KeydownEvent]
Użytkownik wcisnął klawisz na klawiaturze a element playera miał ustawiony fokus.

#### `done`
Odtwarzanie playlisty zostało zakończone, czyli aktualnie odtwarzany element playlisty jest jej elementem ostatnim i status odtwarzania tego element osiągnął punkt `COMPLETED`.
