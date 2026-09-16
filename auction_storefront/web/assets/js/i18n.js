/* i18n.js — UI localisation for the Hammer & Hearth storefront.
 *
 * Strings are stored as positional arrays against KEYS to keep the payload small.
 * To add a locale: append an entry to STRINGS with exactly KEYS.length values,
 * add its endonym to NAMES, and (if written right-to-left) add its tag to RTL.
 *
 * NOTE FOR LAUNCH: these translations are machine-assisted and cover the UI
 * chrome only. Lot descriptions stay in the language they were catalogued in.
 * Have a native speaker review each locale before you take real orders in it.
 */

const KEYS = [
  "tagline", "navCatalogue", "navHow", "navShipping", "navContact",
  "search", "filters", "category", "all", "condition", "sort",
  "sortNew", "sortLow", "sortHigh", "lotNo", "estimate", "provenance",
  "dimensions", "addToCart", "added", "sold", "details", "cart",
  "cartEmpty", "subtotal", "shipping", "tax", "total", "checkout", "remove",
  "contactStep", "addressStep", "paymentStep", "email", "fullName", "city",
  "postal", "country", "payNow", "cards", "bnpl", "wallets", "back",
  "summary", "secured", "language", "currency", "assistantTitle",
  "assistantPrompt", "results", "street", "continue", "payLater",
];

const STRINGS = {
  "en": ["Auction-sourced. One of each.","Catalogue","How it works","Shipping","Contact","Search lots","Refine","Category","All","Condition","Sort","Newly listed","Price: low to high","Price: high to low","Lot","Auction estimate","Provenance","Dimensions","Add to cart","Added","Sold","View details","Cart","Your cart is empty.","Subtotal","Shipping","Tax","Total","Checkout","Remove","Contact","Address","Payment","Email","Full name","City","Postal code","Country","Pay now","Cards","Buy now, pay later","Wallets","Back","Order summary","Encrypted checkout","Language","Currency","Ask the curator","Ask about a lot, sizing, shipping…","lots","Street address","Continue","4 interest-free payments"],
  "es": ["De subasta. Pieza única.","Catálogo","Cómo funciona","Envíos","Contacto","Buscar lotes","Refinar","Categoría","Todo","Estado","Ordenar","Novedades","Precio: de menor a mayor","Precio: de mayor a menor","Lote","Estimación de subasta","Procedencia","Dimensiones","Añadir al carrito","Añadido","Vendido","Ver detalles","Carrito","Tu carrito está vacío.","Subtotal","Envío","Impuestos","Total","Pagar","Quitar","Contacto","Dirección","Pago","Correo electrónico","Nombre completo","Ciudad","Código postal","País","Pagar ahora","Tarjetas","Compra ahora, paga después","Carteras","Atrás","Resumen del pedido","Pago cifrado","Idioma","Moneda","Pregunta al curador","Pregunta por un lote, medidas, envío…","lotes","Calle y número","Continuar","4 pagos sin intereses"],
  "pt": ["De leilão. Peça única.","Catálogo","Como funciona","Envio","Contacto","Procurar lotes","Refinar","Categoria","Tudo","Estado","Ordenar","Novidades","Preço: do menor ao maior","Preço: do maior ao menor","Lote","Estimativa de leilão","Proveniência","Dimensões","Adicionar ao carrinho","Adicionado","Vendido","Ver detalhes","Carrinho","O seu carrinho está vazio.","Subtotal","Envio","Impostos","Total","Finalizar compra","Remover","Contacto","Morada","Pagamento","E-mail","Nome completo","Cidade","Código postal","País","Pagar agora","Cartões","Compre agora, pague depois","Carteiras","Voltar","Resumo do pedido","Pagamento encriptado","Idioma","Moeda","Pergunte ao curador","Pergunte sobre um lote, medidas, envio…","lotes","Rua e número","Continuar","4 pagamentos sem juros"],
  "fr": ["Issu d'enchères. Pièce unique.","Catalogue","Comment ça marche","Livraison","Contact","Rechercher des lots","Affiner","Catégorie","Tout","État","Trier","Nouveautés","Prix : croissant","Prix : décroissant","Lot","Estimation d'enchère","Provenance","Dimensions","Ajouter au panier","Ajouté","Vendu","Voir le détail","Panier","Votre panier est vide.","Sous-total","Livraison","Taxes","Total","Commander","Retirer","Contact","Adresse","Paiement","E-mail","Nom complet","Ville","Code postal","Pays","Payer maintenant","Cartes","Achetez maintenant, payez plus tard","Portefeuilles","Retour","Récapitulatif","Paiement chiffré","Langue","Devise","Demandez au curateur","Une question sur un lot, les tailles, la livraison…","lots","Numéro et rue","Continuer","4 paiements sans frais"],
  "de": ["Aus Auktionen. Jedes Stück ein Unikat.","Katalog","So funktioniert's","Versand","Kontakt","Lose suchen","Filtern","Kategorie","Alle","Zustand","Sortieren","Neu eingestellt","Preis: aufsteigend","Preis: absteigend","Los","Auktionsschätzung","Provenienz","Maße","In den Warenkorb","Hinzugefügt","Verkauft","Details ansehen","Warenkorb","Ihr Warenkorb ist leer.","Zwischensumme","Versand","Steuern","Gesamt","Zur Kasse","Entfernen","Kontakt","Adresse","Zahlung","E-Mail","Vollständiger Name","Stadt","Postleitzahl","Land","Jetzt bezahlen","Karten","Jetzt kaufen, später bezahlen","Wallets","Zurück","Bestellübersicht","Verschlüsselte Kasse","Sprache","Währung","Fragen Sie den Kurator","Fragen zu Los, Maßen oder Versand…","Lose","Straße und Hausnummer","Weiter","4 zinsfreie Raten"],
  "it": ["Dalle aste. Pezzo unico.","Catalogo","Come funziona","Spedizione","Contatti","Cerca lotti","Filtra","Categoria","Tutti","Condizione","Ordina","Novità","Prezzo: crescente","Prezzo: decrescente","Lotto","Stima d'asta","Provenienza","Dimensioni","Aggiungi al carrello","Aggiunto","Venduto","Vedi dettagli","Carrello","Il tuo carrello è vuoto.","Subtotale","Spedizione","Imposte","Totale","Vai alla cassa","Rimuovi","Contatti","Indirizzo","Pagamento","E-mail","Nome completo","Città","CAP","Paese","Paga ora","Carte","Compra ora, paga dopo","Portafogli","Indietro","Riepilogo ordine","Pagamento crittografato","Lingua","Valuta","Chiedi al curatore","Chiedi di un lotto, misure, spedizione…","lotti","Via e numero","Continua","4 rate senza interessi"],
  "nl": ["Van veilingen. Elk stuk uniek.","Catalogus","Zo werkt het","Verzending","Contact","Kavels zoeken","Verfijnen","Categorie","Alle","Staat","Sorteren","Nieuw aangeboden","Prijs: laag naar hoog","Prijs: hoog naar laag","Kavel","Veilingtaxatie","Herkomst","Afmetingen","In winkelwagen","Toegevoegd","Verkocht","Details bekijken","Winkelwagen","Je winkelwagen is leeg.","Subtotaal","Verzending","Btw","Totaal","Afrekenen","Verwijderen","Contact","Adres","Betaling","E-mail","Volledige naam","Plaats","Postcode","Land","Nu betalen","Kaarten","Nu kopen, later betalen","Wallets","Terug","Besteloverzicht","Versleutelde betaling","Taal","Valuta","Vraag het de curator","Vraag naar een kavel, maten, verzending…","kavels","Straat en huisnummer","Doorgaan","4 rentevrije termijnen"],
  "pl": ["Z aukcji. Każdy przedmiot jedyny.","Katalog","Jak to działa","Wysyłka","Kontakt","Szukaj pozycji","Zawęź","Kategoria","Wszystkie","Stan","Sortuj","Nowo dodane","Cena: rosnąco","Cena: malejąco","Pozycja","Wycena aukcyjna","Pochodzenie","Wymiary","Dodaj do koszyka","Dodano","Sprzedane","Zobacz szczegóły","Koszyk","Twój koszyk jest pusty.","Suma częściowa","Wysyłka","Podatek","Razem","Do kasy","Usuń","Kontakt","Adres","Płatność","E-mail","Imię i nazwisko","Miasto","Kod pocztowy","Kraj","Zapłać teraz","Karty","Kup teraz, zapłać później","Portfele","Wstecz","Podsumowanie zamówienia","Szyfrowana płatność","Język","Waluta","Zapytaj kuratora","Zapytaj o pozycję, wymiary, wysyłkę…","pozycji","Ulica i numer","Dalej","4 raty bez odsetek"],
  "cs": ["Z aukcí. Každý kus jedinečný.","Katalog","Jak to funguje","Doprava","Kontakt","Hledat položky","Zúžit","Kategorie","Vše","Stav","Řadit","Nově přidané","Cena: vzestupně","Cena: sestupně","Položka","Aukční odhad","Původ","Rozměry","Do košíku","Přidáno","Prodáno","Zobrazit detail","Košík","Váš košík je prázdný.","Mezisoučet","Doprava","Daň","Celkem","Pokladna","Odebrat","Kontakt","Adresa","Platba","E-mail","Celé jméno","Město","PSČ","Země","Zaplatit","Karty","Kupte teď, zaplaťte později","Peněženky","Zpět","Souhrn objednávky","Šifrovaná platba","Jazyk","Měna","Zeptejte se kurátora","Zeptejte se na položku, rozměry, dopravu…","položek","Ulice a číslo","Pokračovat","4 splátky bez úroků"],
  "ro": ["De la licitații. Fiecare piesă unică.","Catalog","Cum funcționează","Livrare","Contact","Caută loturi","Filtrează","Categorie","Toate","Stare","Sortează","Nou listate","Preț: crescător","Preț: descrescător","Lot","Estimare de licitație","Proveniență","Dimensiuni","Adaugă în coș","Adăugat","Vândut","Vezi detalii","Coș","Coșul tău este gol.","Subtotal","Livrare","Taxe","Total","Finalizează comanda","Elimină","Contact","Adresă","Plată","E-mail","Nume complet","Oraș","Cod poștal","Țară","Plătește acum","Carduri","Cumpără acum, plătește mai târziu","Portofele","Înapoi","Sumar comandă","Plată criptată","Limbă","Monedă","Întreabă curatorul","Întreabă despre un lot, dimensiuni, livrare…","loturi","Stradă și număr","Continuă","4 rate fără dobândă"],
  "el": ["Από δημοπρασίες. Κάθε κομμάτι μοναδικό.","Κατάλογος","Πώς λειτουργεί","Αποστολή","Επικοινωνία","Αναζήτηση αντικειμένων","Φιλτράρισμα","Κατηγορία","Όλα","Κατάσταση","Ταξινόμηση","Νέες καταχωρίσεις","Τιμή: αύξουσα","Τιμή: φθίνουσα","Αντικείμενο","Εκτίμηση δημοπρασίας","Προέλευση","Διαστάσεις","Προσθήκη στο καλάθι","Προστέθηκε","Πουλήθηκε","Δείτε λεπτομέρειες","Καλάθι","Το καλάθι σας είναι άδειο.","Μερικό σύνολο","Αποστολή","Φόροι","Σύνολο","Ολοκλήρωση αγοράς","Αφαίρεση","Επικοινωνία","Διεύθυνση","Πληρωμή","E-mail","Ονοματεπώνυμο","Πόλη","Ταχυδρομικός κώδικας","Χώρα","Πληρωμή τώρα","Κάρτες","Αγοράστε τώρα, πληρώστε αργότερα","Πορτοφόλια","Πίσω","Σύνοψη παραγγελίας","Κρυπτογραφημένη πληρωμή","Γλώσσα","Νόμισμα","Ρωτήστε τον επιμελητή","Ρωτήστε για αντικείμενο, διαστάσεις, αποστολή…","αντικείμενα","Οδός και αριθμός","Συνέχεια","4 άτοκες δόσεις"],
  "sv": ["Från auktioner. Varje föremål unikt.","Katalog","Så fungerar det","Frakt","Kontakt","Sök föremål","Förfina","Kategori","Alla","Skick","Sortera","Nyinlagda","Pris: lågt till högt","Pris: högt till lågt","Objekt","Auktionsvärdering","Proveniens","Mått","Lägg i varukorgen","Tillagd","Såld","Visa detaljer","Varukorg","Din varukorg är tom.","Delsumma","Frakt","Moms","Totalt","Till kassan","Ta bort","Kontakt","Adress","Betalning","E-post","Fullständigt namn","Ort","Postnummer","Land","Betala nu","Kort","Köp nu, betala senare","Plånböcker","Tillbaka","Ordersammanfattning","Krypterad betalning","Språk","Valuta","Fråga curatorn","Fråga om ett föremål, mått, frakt…","föremål","Gatuadress","Fortsätt","4 räntefria delbetalningar"],
  "da": ["Fra auktioner. Hvert stykke unikt.","Katalog","Sådan virker det","Fragt","Kontakt","Søg varer","Filtrér","Kategori","Alle","Stand","Sortér","Nyligt tilføjet","Pris: lav til høj","Pris: høj til lav","Vare","Auktionsvurdering","Proveniens","Mål","Læg i kurv","Tilføjet","Solgt","Se detaljer","Kurv","Din kurv er tom.","Subtotal","Fragt","Moms","I alt","Til kassen","Fjern","Kontakt","Adresse","Betaling","E-mail","Fulde navn","By","Postnummer","Land","Betal nu","Kort","Køb nu, betal senere","Wallets","Tilbage","Ordreoversigt","Krypteret betaling","Sprog","Valuta","Spørg kuratoren","Spørg om en vare, mål, fragt…","varer","Vejnavn og nummer","Fortsæt","4 rentefri betalinger"],
  "fi": ["Huutokaupoista. Jokainen esine ainutlaatuinen.","Luettelo","Näin se toimii","Toimitus","Yhteystiedot","Hae kohteita","Rajaa","Kategoria","Kaikki","Kunto","Järjestä","Uusimmat","Hinta: alhaisin ensin","Hinta: korkein ensin","Kohde","Huutokauppa-arvio","Alkuperä","Mitat","Lisää ostoskoriin","Lisätty","Myyty","Katso tiedot","Ostoskori","Ostoskorisi on tyhjä.","Välisumma","Toimitus","Vero","Yhteensä","Kassalle","Poista","Yhteystiedot","Osoite","Maksu","Sähköposti","Koko nimi","Kaupunki","Postinumero","Maa","Maksa nyt","Kortit","Osta nyt, maksa myöhemmin","Lompakot","Takaisin","Tilauksen yhteenveto","Salattu maksu","Kieli","Valuutta","Kysy kuraattorilta","Kysy kohteesta, mitoista, toimituksesta…","kohdetta","Katuosoite","Jatka","4 korotonta erää"],
  "tr": ["Müzayededen. Her parça tek.","Katalog","Nasıl çalışır","Kargo","İletişim","Parça ara","Daralt","Kategori","Tümü","Durum","Sırala","Yeni eklenenler","Fiyat: artan","Fiyat: azalan","Parça","Müzayede tahmini","Köken","Ölçüler","Sepete ekle","Eklendi","Satıldı","Ayrıntıları gör","Sepet","Sepetiniz boş.","Ara toplam","Kargo","Vergi","Toplam","Ödemeye geç","Kaldır","İletişim","Adres","Ödeme","E-posta","Ad soyad","Şehir","Posta kodu","Ülke","Şimdi öde","Kartlar","Şimdi al, sonra öde","Cüzdanlar","Geri","Sipariş özeti","Şifreli ödeme","Dil","Para birimi","Küratöre sorun","Parça, ölçü veya kargo hakkında sorun…","parça","Sokak ve numara","Devam","4 taksit, faizsiz"],
  "ru": ["С аукционов. Каждый предмет единственный.","Каталог","Как это работает","Доставка","Контакты","Поиск лотов","Уточнить","Категория","Все","Состояние","Сортировка","Новые поступления","Цена: по возрастанию","Цена: по убыванию","Лот","Аукционная оценка","Происхождение","Размеры","В корзину","Добавлено","Продано","Подробнее","Корзина","Ваша корзина пуста.","Промежуточный итог","Доставка","Налог","Итого","Оформить заказ","Удалить","Контакты","Адрес","Оплата","Эл. почта","Полное имя","Город","Почтовый индекс","Страна","Оплатить","Карты","Купить сейчас, заплатить потом","Кошельки","Назад","Сводка заказа","Зашифрованная оплата","Язык","Валюта","Спросить куратора","Спросите о лоте, размерах, доставке…","лотов","Улица и дом","Продолжить","4 платежа без процентов"],
  "uk": ["З аукціонів. Кожен предмет унікальний.","Каталог","Як це працює","Доставка","Контакти","Пошук лотів","Уточнити","Категорія","Усі","Стан","Сортування","Нові надходження","Ціна: за зростанням","Ціна: за спаданням","Лот","Аукційна оцінка","Походження","Розміри","До кошика","Додано","Продано","Детальніше","Кошик","Ваш кошик порожній.","Проміжний підсумок","Доставка","Податок","Разом","Оформити замовлення","Вилучити","Контакти","Адреса","Оплата","Ел. пошта","Повне ім'я","Місто","Поштовий індекс","Країна","Сплатити","Картки","Купуйте зараз, платіть пізніше","Гаманці","Назад","Підсумок замовлення","Зашифрована оплата","Мова","Валюта","Запитати куратора","Запитайте про лот, розміри, доставку…","лотів","Вулиця і будинок","Далі","4 платежі без відсотків"],
  "ar": ["من المزادات. كل قطعة فريدة.","الكتالوج","كيف يعمل","الشحن","اتصل بنا","ابحث عن القطع","تصفية","الفئة","الكل","الحالة","ترتيب","المضاف حديثًا","السعر: من الأقل إلى الأعلى","السعر: من الأعلى إلى الأقل","قطعة","تقدير المزاد","المصدر","الأبعاد","أضف إلى السلة","تمت الإضافة","تم البيع","عرض التفاصيل","السلة","سلتك فارغة.","المجموع الفرعي","الشحن","الضريبة","الإجمالي","إتمام الشراء","إزالة","اتصل بنا","العنوان","الدفع","البريد الإلكتروني","الاسم الكامل","المدينة","الرمز البريدي","الدولة","ادفع الآن","البطاقات","اشترِ الآن وادفع لاحقًا","المحافظ","رجوع","ملخص الطلب","دفع مشفّر","اللغة","العملة","اسأل أمين المعرض","اسأل عن قطعة أو المقاسات أو الشحن…","قطعة","الشارع ورقم المبنى","متابعة","4 دفعات بدون فوائد"],
  "he": ["ממכירות פומביות. כל פריט יחיד במינו.","קטלוג","איך זה עובד","משלוח","צור קשר","חיפוש פריטים","סינון","קטגוריה","הכול","מצב","מיון","נוספו לאחרונה","מחיר: מהנמוך לגבוה","מחיר: מהגבוה לנמוך","פריט","הערכת מכירה","מקור","מידות","הוסף לסל","נוסף","נמכר","הצג פרטים","סל","הסל שלך ריק.","סכום ביניים","משלוח","מס","סה״כ","לתשלום","הסר","צור קשר","כתובת","תשלום","דוא״ל","שם מלא","עיר","מיקוד","מדינה","שלם עכשיו","כרטיסים","קנה עכשיו, שלם אחר כך","ארנקים","חזרה","סיכום הזמנה","תשלום מוצפן","שפה","מטבע","שאל את האוצר","שאל על פריט, מידות, משלוח…","פריטים","רחוב ומספר","המשך","4 תשלומים ללא ריבית"],
  "fa": ["از حراجی‌ها. هر قطعه یکتا.","کاتالوگ","چگونه کار می‌کند","ارسال","تماس","جستجوی قطعات","پالایش","دسته‌بندی","همه","وضعیت","مرتب‌سازی","تازه‌ها","قیمت: کم به زیاد","قیمت: زیاد به کم","قطعه","برآورد حراج","خاستگاه","ابعاد","افزودن به سبد","افزوده شد","فروخته شد","مشاهده جزئیات","سبد خرید","سبد خرید شما خالی است.","جمع جزء","ارسال","مالیات","مجموع","تسویه حساب","حذف","تماس","نشانی","پرداخت","ایمیل","نام کامل","شهر","کد پستی","کشور","پرداخت کنید","کارت‌ها","اکنون بخرید، بعداً بپردازید","کیف‌پول‌ها","بازگشت","خلاصه سفارش","پرداخت رمزگذاری‌شده","زبان","واحد پول","از متصدی بپرسید","درباره قطعه، اندازه یا ارسال بپرسید…","قطعه","خیابان و پلاک","ادامه","۴ قسط بدون بهره"],
  "hi": ["नीलामी से। हर वस्तु अनूठी।","सूची","यह कैसे काम करता है","शिपिंग","संपर्क","वस्तुएँ खोजें","छाँटें","श्रेणी","सभी","स्थिति","क्रमबद्ध करें","नई सूचीबद्ध","कीमत: कम से अधिक","कीमत: अधिक से कम","लॉट","नीलामी अनुमान","उद्गम","आयाम","कार्ट में डालें","जोड़ा गया","बिक गया","विवरण देखें","कार्ट","आपका कार्ट खाली है।","उप-योग","शिपिंग","कर","कुल","भुगतान करें","हटाएँ","संपर्क","पता","भुगतान","ईमेल","पूरा नाम","शहर","पिन कोड","देश","अभी भुगतान करें","कार्ड","अभी खरीदें, बाद में भुगतान करें","वॉलेट","वापस","ऑर्डर सारांश","एन्क्रिप्टेड भुगतान","भाषा","मुद्रा","क्यूरेटर से पूछें","वस्तु, माप या शिपिंग के बारे में पूछें…","वस्तुएँ","गली और मकान नंबर","आगे बढ़ें","4 ब्याज-मुक्त किस्तें"],
  "bn": ["নিলাম থেকে। প্রতিটি জিনিস অনন্য।","ক্যাটালগ","কীভাবে কাজ করে","শিপিং","যোগাযোগ","লট খুঁজুন","ছাঁকুন","বিভাগ","সব","অবস্থা","সাজান","নতুন তালিকাভুক্ত","দাম: কম থেকে বেশি","দাম: বেশি থেকে কম","লট","নিলাম অনুমান","উৎস","মাপ","কার্টে যোগ করুন","যোগ হয়েছে","বিক্রি হয়েছে","বিস্তারিত দেখুন","কার্ট","আপনার কার্ট খালি।","উপমোট","শিপিং","কর","মোট","চেকআউট","সরান","যোগাযোগ","ঠিকানা","পেমেন্ট","ইমেইল","পুরো নাম","শহর","পোস্ট কোড","দেশ","এখন পরিশোধ করুন","কার্ড","এখন কিনুন, পরে দিন","ওয়ালেট","পিছনে","অর্ডার সারাংশ","এনক্রিপ্টেড পেমেন্ট","ভাষা","মুদ্রা","কিউরেটরকে জিজ্ঞাসা করুন","লট, মাপ বা শিপিং সম্পর্কে জিজ্ঞাসা করুন…","লট","রাস্তা ও নম্বর","চালিয়ে যান","৪টি সুদমুক্ত কিস্তি"],
  "ur": ["نیلامی سے۔ ہر شے منفرد۔","کیٹلاگ","یہ کیسے کام کرتا ہے","ترسیل","رابطہ","اشیاء تلاش کریں","چھانٹیں","زمرہ","سب","حالت","ترتیب دیں","نئی فہرست","قیمت: کم سے زیادہ","قیمت: زیادہ سے کم","شے","نیلامی تخمینہ","اصل","پیمائش","ٹوکری میں ڈالیں","شامل ہو گیا","فروخت ہو گیا","تفصیلات دیکھیں","ٹوکری","آپ کی ٹوکری خالی ہے۔","ذیلی میزان","ترسیل","ٹیکس","کل","ادائیگی کریں","ہٹائیں","رابطہ","پتہ","ادائیگی","ای میل","پورا نام","شہر","پوسٹل کوڈ","ملک","ابھی ادا کریں","کارڈز","ابھی خریدیں، بعد میں ادا کریں","والٹس","واپس","آرڈر کا خلاصہ","خفیہ کردہ ادائیگی","زبان","کرنسی","کیوریٹر سے پوچھیں","کسی شے، پیمائش یا ترسیل کے بارے میں پوچھیں…","اشیاء","گلی اور مکان نمبر","جاری رکھیں","4 بلا سود اقساط"],
  "th": ["จากการประมูล ชิ้นเดียวในโลก","แคตตาล็อก","วิธีสั่งซื้อ","การจัดส่ง","ติดต่อ","ค้นหารายการ","กรอง","หมวดหมู่","ทั้งหมด","สภาพ","จัดเรียง","รายการใหม่","ราคา: ต่ำไปสูง","ราคา: สูงไปต่ำ","รายการ","ราคาประเมิน","ที่มา","ขนาด","ใส่ตะกร้า","เพิ่มแล้ว","ขายแล้ว","ดูรายละเอียด","ตะกร้า","ตะกร้าของคุณว่างเปล่า","ยอดรวมย่อย","ค่าจัดส่ง","ภาษี","ยอดรวม","ชำระเงิน","นำออก","ติดต่อ","ที่อยู่","การชำระเงิน","อีเมล","ชื่อ-นามสกุล","เมือง","รหัสไปรษณีย์","ประเทศ","ชำระเงินตอนนี้","บัตร","ซื้อก่อน จ่ายทีหลัง","วอลเล็ต","ย้อนกลับ","สรุปคำสั่งซื้อ","การชำระเงินที่เข้ารหัส","ภาษา","สกุลเงิน","ถามภัณฑารักษ์","ถามเกี่ยวกับรายการ ขนาด หรือการจัดส่ง…","รายการ","บ้านเลขที่และถนน","ดำเนินการต่อ","ผ่อน 4 งวด ไม่มีดอกเบี้ย"],
  "vi": ["Từ các phiên đấu giá. Mỗi món một bản.","Danh mục","Cách hoạt động","Vận chuyển","Liên hệ","Tìm món","Lọc","Danh mục","Tất cả","Tình trạng","Sắp xếp","Mới đăng","Giá: thấp đến cao","Giá: cao đến thấp","Món","Định giá đấu giá","Nguồn gốc","Kích thước","Thêm vào giỏ","Đã thêm","Đã bán","Xem chi tiết","Giỏ hàng","Giỏ hàng của bạn đang trống.","Tạm tính","Vận chuyển","Thuế","Tổng cộng","Thanh toán","Xóa","Liên hệ","Địa chỉ","Thanh toán","Email","Họ và tên","Thành phố","Mã bưu chính","Quốc gia","Thanh toán ngay","Thẻ","Mua trước, trả sau","Ví điện tử","Quay lại","Tóm tắt đơn hàng","Thanh toán được mã hóa","Ngôn ngữ","Tiền tệ","Hỏi người phụ trách","Hỏi về một món, kích thước hay vận chuyển…","món","Số nhà và đường","Tiếp tục","4 kỳ trả góp không lãi"],
  "id": ["Dari lelang. Setiap barang satu-satunya.","Katalog","Cara kerjanya","Pengiriman","Kontak","Cari lot","Saring","Kategori","Semua","Kondisi","Urutkan","Baru ditambahkan","Harga: rendah ke tinggi","Harga: tinggi ke rendah","Lot","Estimasi lelang","Asal","Dimensi","Tambah ke keranjang","Ditambahkan","Terjual","Lihat detail","Keranjang","Keranjang Anda kosong.","Subtotal","Pengiriman","Pajak","Total","Bayar","Hapus","Kontak","Alamat","Pembayaran","Email","Nama lengkap","Kota","Kode pos","Negara","Bayar sekarang","Kartu","Beli sekarang, bayar nanti","Dompet digital","Kembali","Ringkasan pesanan","Pembayaran terenkripsi","Bahasa","Mata uang","Tanya kurator","Tanya tentang lot, ukuran, atau pengiriman…","lot","Jalan dan nomor","Lanjut","4 cicilan tanpa bunga"],
  "tl": ["Mula sa auction. Tig-isa lang bawat piraso.","Katalogo","Paano ito gumagana","Padala","Kontak","Maghanap ng lote","Salain","Kategorya","Lahat","Kalagayan","Ayusin","Bagong nakalista","Presyo: mababa pataas","Presyo: mataas pababa","Lote","Tantiya sa auction","Pinagmulan","Sukat","Idagdag sa cart","Naidagdag","Nabenta","Tingnan ang detalye","Cart","Walang laman ang iyong cart.","Subtotal","Padala","Buwis","Kabuuan","Mag-checkout","Alisin","Kontak","Address","Bayad","Email","Buong pangalan","Lungsod","Postal code","Bansa","Magbayad ngayon","Mga card","Bilhin ngayon, bayaran mamaya","Mga wallet","Bumalik","Buod ng order","Naka-encrypt na bayad","Wika","Pera","Magtanong sa kurator","Magtanong tungkol sa lote, sukat, o padala…","lote","Kalye at numero","Magpatuloy","4 na hulog na walang interes"],
  "zh-Hans": ["源自拍卖会，每件仅此一件。","目录","购买流程","配送","联系我们","搜索拍品","筛选","类别","全部","品相","排序","最新上架","价格：由低到高","价格：由高到低","拍品","拍卖估价","来源","尺寸","加入购物车","已加入","已售出","查看详情","购物车","购物车是空的。","小计","运费","税费","合计","结算","移除","联系方式","地址","支付","电子邮箱","姓名","城市","邮政编码","国家/地区","立即支付","银行卡","先买后付","电子钱包","返回","订单摘要","加密支付","语言","货币","咨询策展人","询问拍品、尺寸或配送…","件","街道地址","继续","4 期免息"],
  "zh-Hant": ["源自拍賣會，每件僅此一件。","目錄","購買流程","配送","聯絡我們","搜尋拍品","篩選","類別","全部","品相","排序","最新上架","價格：由低到高","價格：由高到低","拍品","拍賣估價","來源","尺寸","加入購物車","已加入","已售出","查看詳情","購物車","購物車是空的。","小計","運費","稅費","合計","結帳","移除","聯絡方式","地址","付款","電子郵件","姓名","城市","郵遞區號","國家/地區","立即付款","信用卡","先買後付","電子錢包","返回","訂單摘要","加密付款","語言","貨幣","諮詢策展人","詢問拍品、尺寸或配送…","件","街道地址","繼續","4 期零利率"],
  "ja": ["オークション仕入れ。すべて一点物。","カタログ","ご利用の流れ","配送","お問い合わせ","作品を検索","絞り込み","カテゴリー","すべて","状態","並べ替え","新着","価格：安い順","価格：高い順","ロット","落札予想価格","来歴","サイズ","カートに入れる","追加しました","売約済み","詳細を見る","カート","カートは空です。","小計","送料","税","合計","購入手続きへ","削除","連絡先","住所","お支払い","メールアドレス","氏名","市区町村","郵便番号","国・地域","今すぐ支払う","カード","後払い","ウォレット","戻る","ご注文内容","暗号化された決済","言語","通貨","キュレーターに聞く","作品・サイズ・配送についてご質問ください…","点","番地・建物名","次へ","分割4回・手数料無料"],
  "ko": ["경매에서 수급. 모두 단 하나뿐.","카탈로그","이용 방법","배송","문의","작품 검색","필터","카테고리","전체","상태","정렬","최신 등록","가격: 낮은 순","가격: 높은 순","로트","경매 추정가","출처","크기","장바구니에 담기","담김","판매 완료","상세 보기","장바구니","장바구니가 비어 있습니다.","소계","배송비","세금","합계","결제하기","삭제","연락처","주소","결제","이메일","이름","도시","우편번호","국가","지금 결제","카드","지금 구매, 나중에 결제","간편결제","뒤로","주문 요약","암호화된 결제","언어","통화","큐레이터에게 문의","작품, 크기, 배송에 대해 물어보세요…","점","도로명 주소","계속","무이자 4개월 할부"],
  "sw": ["Kutoka minadani. Kila kipande ni cha pekee.","Katalogi","Jinsi inavyofanya kazi","Usafirishaji","Wasiliana nasi","Tafuta vipande","Chuja","Aina","Vyote","Hali","Panga","Vilivyoongezwa karibuni","Bei: chini hadi juu","Bei: juu hadi chini","Kipande","Makadirio ya mnada","Asili","Vipimo","Weka kwenye kikapu","Kimeongezwa","Kimeuzwa","Ona maelezo","Kikapu","Kikapu chako ni tupu.","Jumla ndogo","Usafirishaji","Kodi","Jumla","Lipa","Ondoa","Wasiliana nasi","Anwani","Malipo","Barua pepe","Jina kamili","Jiji","Msimbo wa posta","Nchi","Lipa sasa","Kadi","Nunua sasa, lipa baadaye","Pochi za kidijitali","Rudi","Muhtasari wa oda","Malipo yaliyosimbwa","Lugha","Sarafu","Muulize msimamizi","Uliza kuhusu kipande, vipimo au usafirishaji…","vipande","Mtaa na namba","Endelea","Malipo 4 bila riba"],
};

/* Endonyms — each language named in its own script, the way a shopper
   scanning the list will recognise it. */
const NAMES = {
  "en": "English", "es": "Español", "pt": "Português", "fr": "Français",
  "de": "Deutsch", "it": "Italiano", "nl": "Nederlands", "pl": "Polski",
  "cs": "Čeština", "ro": "Română", "el": "Ελληνικά", "sv": "Svenska",
  "da": "Dansk", "fi": "Suomi", "tr": "Türkçe", "ru": "Русский",
  "uk": "Українська", "ar": "العربية", "he": "עברית", "fa": "فارسی",
  "hi": "हिन्दी", "bn": "বাংলা", "ur": "اردو", "th": "ไทย",
  "vi": "Tiếng Việt", "id": "Bahasa Indonesia", "tl": "Filipino",
  "zh-Hans": "简体中文", "zh-Hant": "繁體中文", "ja": "日本語",
  "ko": "한국어", "sw": "Kiswahili",
};

const RTL = new Set(["ar", "he", "fa", "ur"]);

/* Indicative conversion rates against USD, used only to price the window.
   Swap RATES for a live feed (the reference server exposes /api/rates) before
   you take real orders — a stale rate quietly eats your margin. */
const RATES = {
  USD: 1, EUR: 0.92, GBP: 0.79, CHF: 0.88, CAD: 1.36, AUD: 1.52, NZD: 1.64,
  JPY: 152, CNY: 7.24, HKD: 7.82, SGD: 1.35, KRW: 1340, INR: 83.4, PKR: 278,
  BDT: 110, THB: 36.2, VND: 24800, IDR: 15700, MYR: 4.72, PHP: 56.3,
  SEK: 10.6, NOK: 10.8, DKK: 6.87, PLN: 3.98, CZK: 23.2, RON: 4.58,
  TRY: 32.1, RUB: 92.5, UAH: 39.2, ILS: 3.72, AED: 3.67, SAR: 3.75,
  EGP: 47.6, ZAR: 18.7, NGN: 1420, KES: 132, GHS: 13.1, MAD: 10.0,
  BRL: 5.05, MXN: 17.1, ARS: 870, CLP: 945, COP: 3920, PEN: 3.74,
};

/* Every country a parcel can plausibly go to. Names are shown in English;
   the browser's own locale data is used for currency and number formatting. */
const COUNTRIES = "AF:Afghanistan|AL:Albania|DZ:Algeria|AD:Andorra|AO:Angola|AG:Antigua and Barbuda|AR:Argentina|AM:Armenia|AU:Australia|AT:Austria|AZ:Azerbaijan|BS:Bahamas|BH:Bahrain|BD:Bangladesh|BB:Barbados|BY:Belarus|BE:Belgium|BZ:Belize|BJ:Benin|BM:Bermuda|BT:Bhutan|BO:Bolivia|BA:Bosnia and Herzegovina|BW:Botswana|BR:Brazil|BN:Brunei|BG:Bulgaria|BF:Burkina Faso|BI:Burundi|KH:Cambodia|CM:Cameroon|CA:Canada|CV:Cabo Verde|KY:Cayman Islands|CF:Central African Republic|TD:Chad|CL:Chile|CN:China|CO:Colombia|KM:Comoros|CG:Congo|CD:Congo (DRC)|CR:Costa Rica|CI:Côte d'Ivoire|HR:Croatia|CU:Cuba|CY:Cyprus|CZ:Czechia|DK:Denmark|DJ:Djibouti|DM:Dominica|DO:Dominican Republic|EC:Ecuador|EG:Egypt|SV:El Salvador|GQ:Equatorial Guinea|ER:Eritrea|EE:Estonia|SZ:Eswatini|ET:Ethiopia|FJ:Fiji|FI:Finland|FR:France|GA:Gabon|GM:Gambia|GE:Georgia|DE:Germany|GH:Ghana|GI:Gibraltar|GR:Greece|GL:Greenland|GD:Grenada|GT:Guatemala|GN:Guinea|GW:Guinea-Bissau|GY:Guyana|HT:Haiti|HN:Honduras|HK:Hong Kong SAR|HU:Hungary|IS:Iceland|IN:India|ID:Indonesia|IQ:Iraq|IE:Ireland|IL:Israel|IT:Italy|JM:Jamaica|JP:Japan|JE:Jersey|JO:Jordan|KZ:Kazakhstan|KE:Kenya|KI:Kiribati|KW:Kuwait|KG:Kyrgyzstan|LA:Laos|LV:Latvia|LB:Lebanon|LS:Lesotho|LR:Liberia|LY:Libya|LI:Liechtenstein|LT:Lithuania|LU:Luxembourg|MO:Macao SAR|MG:Madagascar|MW:Malawi|MY:Malaysia|MV:Maldives|ML:Mali|MT:Malta|MH:Marshall Islands|MR:Mauritania|MU:Mauritius|MX:Mexico|FM:Micronesia|MD:Moldova|MC:Monaco|MN:Mongolia|ME:Montenegro|MA:Morocco|MZ:Mozambique|MM:Myanmar|NA:Namibia|NR:Nauru|NP:Nepal|NL:Netherlands|NC:New Caledonia|NZ:New Zealand|NI:Nicaragua|NE:Niger|NG:Nigeria|MK:North Macedonia|NO:Norway|OM:Oman|PK:Pakistan|PW:Palau|PS:Palestine|PA:Panama|PG:Papua New Guinea|PY:Paraguay|PE:Peru|PH:Philippines|PL:Poland|PT:Portugal|PR:Puerto Rico|QA:Qatar|RE:Réunion|RO:Romania|RW:Rwanda|KN:Saint Kitts and Nevis|LC:Saint Lucia|VC:Saint Vincent and the Grenadines|WS:Samoa|SM:San Marino|ST:São Tomé and Príncipe|SA:Saudi Arabia|SN:Senegal|RS:Serbia|SC:Seychelles|SL:Sierra Leone|SG:Singapore|SK:Slovakia|SI:Slovenia|SB:Solomon Islands|ZA:South Africa|KR:South Korea|ES:Spain|LK:Sri Lanka|SR:Suriname|SE:Sweden|CH:Switzerland|TW:Taiwan|TJ:Tajikistan|TZ:Tanzania|TH:Thailand|TL:Timor-Leste|TG:Togo|TO:Tonga|TT:Trinidad and Tobago|TN:Tunisia|TR:Türkiye|TM:Turkmenistan|TV:Tuvalu|UG:Uganda|UA:Ukraine|AE:United Arab Emirates|GB:United Kingdom|US:United States|UY:Uruguay|UZ:Uzbekistan|VU:Vanuatu|VA:Vatican City|VE:Venezuela|VN:Vietnam|YE:Yemen|ZM:Zambia|ZW:Zimbabwe"
  .split("|").map((row) => {
    const [code, name] = row.split(":");
    return { code, name };
  });

/* ---------------------------------------------------------------- runtime */

const LOCALE_KEY = "hh.locale";
const CURRENCY_KEY = "hh.currency";

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private mode — fine */ }
}

/** Best supported locale for the browser's language preferences. */
function detectLocale() {
  const stored = safeGet(LOCALE_KEY);
  if (stored && STRINGS[stored]) return stored;

  for (const tag of navigator.languages || [navigator.language || "en"]) {
    if (STRINGS[tag]) return tag;
    if (tag.startsWith("zh")) {
      return /Hant|TW|HK|MO/i.test(tag) ? "zh-Hant" : "zh-Hans";
    }
    const base = tag.split("-")[0];
    if (STRINGS[base]) return base;
    if (base === "nb" || base === "nn") return "da";  // nearest stocked locale
  }
  return "en";
}

function detectCurrency(locale) {
  const stored = safeGet(CURRENCY_KEY);
  if (stored && RATES[stored]) return stored;

  const region = (navigator.language || "en-US").split("-").pop().toUpperCase();
  const byRegion = {
    US: "USD", GB: "GBP", CA: "CAD", AU: "AUD", NZ: "NZD", JP: "JPY",
    CN: "CNY", HK: "HKD", SG: "SGD", KR: "KRW", IN: "INR", PK: "PKR",
    BD: "BDT", TH: "THB", VN: "VND", ID: "IDR", MY: "MYR", PH: "PHP",
    SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK", RO: "RON",
    TR: "TRY", RU: "RUB", UA: "UAH", IL: "ILS", AE: "AED", SA: "SAR",
    EG: "EGP", ZA: "ZAR", NG: "NGN", KE: "KES", GH: "GHS", MA: "MAD",
    BR: "BRL", MX: "MXN", AR: "ARS", CL: "CLP", CO: "COP", PE: "PEN",
    CH: "CHF",
  };
  if (byRegion[region]) return byRegion[region];
  return ["es", "pt", "fr", "de", "it", "nl", "el", "fi"].includes(locale) ? "EUR" : "USD";
}

export const i18n = {
  locale: "en",
  currency: "USD",

  get languages() {
    return Object.keys(STRINGS)
      .map((code) => ({ code, name: NAMES[code] }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  get currencies() {
    return Object.keys(RATES).sort();
  },

  countries: COUNTRIES,

  /** Translate a key, falling back to English and then to the key itself. */
  t(key) {
    const index = KEYS.indexOf(key);
    if (index === -1) return key;
    const row = STRINGS[this.locale] || STRINGS.en;
    return row[index] || STRINGS.en[index] || key;
  },

  /** Convert a USD amount into the active currency and format it for the locale. */
  price(usd) {
    const rate = RATES[this.currency] ?? 1;
    const amount = usd * rate;
    const zeroDecimal = ["JPY", "KRW", "VND", "IDR", "CLP", "COP"].includes(this.currency);
    try {
      return new Intl.NumberFormat(this.locale, {
        style: "currency",
        currency: this.currency,
        maximumFractionDigits: zeroDecimal ? 0 : 2,
        minimumFractionDigits: zeroDecimal ? 0 : 2,
      }).format(amount);
    } catch {
      return `${this.currency} ${amount.toFixed(zeroDecimal ? 0 : 2)}`;
    }
  },

  /** Raw converted number — for handing a total to a payment provider. */
  convert(usd) {
    return usd * (RATES[this.currency] ?? 1);
  },

  date(iso) {
    try {
      return new Intl.DateTimeFormat(this.locale, { dateStyle: "medium" }).format(new Date(iso));
    } catch {
      return iso;
    }
  },

  setLocale(code) {
    if (!STRINGS[code]) return;
    this.locale = code;
    safeSet(LOCALE_KEY, code);
    document.documentElement.lang = code;
    document.documentElement.dir = RTL.has(code) ? "rtl" : "ltr";
  },

  setCurrency(code) {
    if (!RATES[code]) return;
    this.currency = code;
    safeSet(CURRENCY_KEY, code);
  },

  init() {
    this.setLocale(detectLocale());
    this.setCurrency(detectCurrency(this.locale));
    return this;
  },
};
