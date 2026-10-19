/* 实验数据集：Northwind 风格（与课件 W3Schools TrySQL 的四张表一致）
 * 数据用固定种子生成，每次刷新完全一致，便于判分与讲解。
 */
(function () {
  var seed = 20240917;
  function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
  function pick(a) { return a[Math.floor(rnd() * a.length) % a.length]; }
  function int(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }

  var countries = [
    { c: 'Germany', city: ['Berlin', 'München', 'Köln', 'Stuttgart', 'Leipzig'] },
    { c: 'Mexico', city: ['México D.F.', 'Guadalajara', 'Puebla'] },
    { c: 'UK', city: ['London', 'Cowes', 'Manchester'] },
    { c: 'Sweden', city: ['Luleå', 'Stockholm', 'Göteborg'] },
    { c: 'France', city: ['Paris', 'Marseille', 'Lille'] },
    { c: 'Spain', city: ['Madrid', 'Barcelona', 'Sevilla'] },
    { c: 'Canada', city: ['Montréal', 'Tsawassen', 'Vancouver'] },
    { c: 'USA', city: ['Seattle', 'Boise', 'Portland', 'Walla Walla'] },
    { c: 'Italy', city: ['Torino', 'Reggio Emilia', 'Milano'] },
    { c: 'Portugal', city: ['Lisboa', 'Porto'] },
    { c: 'Brazil', city: ['Rio de Janeiro', 'São Paulo'] },
    { c: 'Argentina', city: ['Buenos Aires', 'Córdoba'] },
    { c: 'Switzerland', city: ['Bern', 'Genève'] },
    { c: 'Austria', city: ['Graz', 'Wien'] },
    { c: 'Belgium', city: ['Bruxelles', 'Charleroi'] },
    { c: 'Denmark', city: ['Århus', 'København'] },
    { c: 'Finland', city: ['Helsinki', 'Oulu'] },
    { c: 'Ireland', city: ['Cork', 'Dublin'] },
    { c: 'Norway', city: ['Oslo', 'Sandvika'] },
    { c: 'Poland', city: ['Warszawa', 'Kraków'] }
  ];
  var firstNames = ['Maria', 'Ana', 'Antonio', 'Thomas', 'Christina', 'Hanna', 'Frédérique', 'Martín', 'Laurence', 'Elizabeth',
    'Victoria', 'Patricio', 'Francisco', 'Yang', 'Pedro', 'Elizabeth', 'Sven', 'Janine', 'Ann', 'Roland',
    'Aria', 'Diego', 'Eduardo', 'José', 'Karl', 'Carine', 'Peter', 'Paolo', 'Lino', 'Horst',
    'Catherine', 'Jean', 'Alexander', 'Simon', 'Yvonne', 'Rene', 'Henriette', 'Guylène', 'Palle', 'Matti',
    'Jytte', 'Patricia', 'Zbyszek', 'Robb', 'Helvetius', 'Pirkko', 'Art', 'Michael', 'Paula', 'Maurizio'];
  var lastNames = ['Anders', 'Trujillo', 'Moreno', 'Hardy', 'Berglund', 'Moos', 'Citeaux', 'Sommer', 'Lebihan', 'Lincoln',
    'Ashworth', 'Simpson', 'Chang', 'Wang', 'Afonso', 'Brown', 'Ottlieb', 'Labrune', 'Devon', 'Mendel',
    'Renne', 'Roel', 'Saavedra', 'Pereira', 'Jablonski', 'Schmitt', 'Franken', 'Accorti', 'Rodriguez', 'Klausen',
    'Dewey', 'Fresnière', 'Feuer', 'Kloss', 'Müller', 'Phillips', 'Pfalzheim', 'Roussel', 'Ibsen', 'Pihlaja',
    'Petersen', 'McKenna', 'Piestrzeniewicz', 'Rossi', 'Leverling', 'Karttunen', 'Braunschweiger', 'Holmes', 'Wilson', 'Gelosi'];
  var companyPrefix = ['Alfreds', 'Ana', 'Antonio', 'Around the', 'Berglunds', 'Blauer', 'Bolido', 'Bon app', "Bottom-Dollar", "B's",
    'Cactus', 'Centro', 'Chop-suey', 'Comércio', 'Consolidated', 'Drachenblut', 'Du monde', 'Eastern', 'Ernst', 'Familia',
    'FISSA', 'Folies', 'Frankenversand', 'France', 'Furia', 'Galeria', 'Godos', 'Gourmet', 'Great', 'GROSELLA',
    'Hanari', 'HILARION', 'Hungry', 'Island', 'Königlich', 'La', 'La maison', 'Laughing', 'Lehmanns', 'LILA',
    'Lonesome', 'Magazzini', 'Maison', 'Morgenstern', 'North/South', 'Océano', 'Old World', 'Ottilies', 'Paris', 'Pericles',
    'Piccolo', 'Princesa', 'Que', 'QUICK', 'Ranch', 'Rattlesnake', 'Reggiani', 'Ricardo', 'Richter', 'Romero',
    'Santé', 'Save-a-lot', 'Seven', 'Simons', 'Spécialités', 'Split', 'Suprêmes', 'Toms', 'Tortuga', 'Tradição',
    "Trail's", 'Vaffeljernet', 'Victuailles', 'Vins', 'Wagner', 'Warwick', 'Wellington', 'White', 'Wilman', 'Wolski',
    'Zaanse', 'Zapori', 'Zhonghua', 'Zürcher', 'Carrera', 'Galería', 'Mère', 'Père', 'Gross', 'Klein'];
  var companySuffix = ['Futterkiste', 'Emparedados y helados', 'Moreno Taquilla', 'del mercado', 'Snabbköp', 'See-Spezialitäten', 'Mère',
    'und Söhne', 'père et fils', 'Alimentación', 'Groceries', 'Cajeros', 'suey House', 'Mercado', 'Holdings', 'Blut',
    'monde', 'Delivery', 'Handel', 'Market', 'Distribuidora', 'Aliments', 'versand', 'Boissons', 'Restaurante', 'Gourmet',
    'Foods', 'Cheese', 'Importers', 'Lácteos', 'Café', 'QL', 'Coyote', 'Trading', 'Küche', 'maison', 'Cheese', 'Delicatessen',
    'Markt', 'Bäckerei', 'Strada', 'Délices', 'Lebensmittel', 'Importers', 'Mercado', 'Alimentos', 'Delikatessen', 'Café',
    'Comidas', 'y helados', 'Ricos', 'Delivery', 'Stop', 'Steaks', 'Imports', 'Alimentos', 'Distribuidora', 'GmbH',
    'Alimentaires', 'Tienda', 'Foods', 'Catering', 'Traiteur', 'Products', 'Fräsch', 'House', 'Import', 'Lda',
    'Büro', 'Bakery', 'Alimentación', 'Vinhos', 'Handel', 'Market', 'Foods', 'Clam House', 'Pasta', 'Kiosk',
    'Koeken', 'Zakuski', 'Foods', 'Kantine', 'Alimentos', 'Gourmet', 'Frères', 'und Söhne', 'Handel', 'GmbH'];

  var streets = ['Obere Str.', 'Avda. de la Constitución', 'Mataderos', 'Hanover Sq.', 'Berguvsvägen', 'Forsterstr.', 'rue St. Honoré',
    'Calle del Rosal', 'King George', 'Rua do Mercado', 'Sierras de Granada', 'Walserweg', 'Via Ludovico il Moro',
    'Carrera 52 con Ave.', 'Rua Frei Caneca', 'Calle Dr. Jorge Cash', 'Erling Skakkes gate', 'Kirchgasse', 'Baker Blvd.',
    'South House', 'Rue Joseph-Bens', 'Boulevard des Capucines', 'Smagsløget', 'Keskuskatu', 'Torikatu', 'Maariankatu',
    '1 rue Alsace-Lorraine', '43 rue St. Laurent', 'Gran Via', 'Via degli Ulivi', 'Avenida dos Lusíadas', 'Warszawska',
    'ul. Filtrowa', 'Cerrito', 'Ing. Gustavo Moncada', 'Starenweg', 'Tannenweg', 'Hauptstr.', 'Garden House', 'The Mall'];

  var Customers = { name: 'Customers', columns: ['CustomerID', 'CustomerName', 'ContactName', 'Address', 'City', 'PostalCode', 'Country'], rows: [] };
  for (var i = 1; i <= 91; i++) {
    var g = countries[(i * 7 + 3) % countries.length];
    Customers.rows.push([
      i,
      companyPrefix[(i - 1) % companyPrefix.length] + ' ' + companySuffix[(i * 3) % companySuffix.length],
      firstNames[(i * 5) % firstNames.length] + ' ' + lastNames[(i * 11) % lastNames.length],
      int(1, 999) + ' ' + pick(streets),
      pick(g.city),
      String(int(10000, 99999)),
      g.c
    ]);
  }

  var productNames = ["Chais", "Chang", "Aniseed Syrup", "Chef Anton's Cajun Seasoning", "Chef Anton's Gumbo Mix",
    "Grandma's Boysenberry Spread", "Uncle Bob's Organic Dried Pears", "Northwoods Cranberry Sauce", "Mishi Kobe Niku",
    "Ikura", "Queso Cabrales", "Queso Manchego La Pastora", "Konbu", "Tofu", "Genen Shouyu", "Pavlova", "Alice Mutton",
    "Carnarvon Tigers", "Teatime Chocolate Biscuits", "Sir Rodney's Marmalade", "Sir Rodney's Scones",
    "Gustaf's Knäckebröd", "Tunnbröd", "Guaraná Fantástica", "NuNuCa Nuß-Nougat-Creme", "Gumbär Gummibärchen",
    "Schoggi Schokolade", "Rössle Sauerkraut", "Thüringer Rostbratwurst", "Nord-Ost Matjeshering", "Gorgonzola Telino",
    "Mascarpone Fabioli", "Geitost", "Sasquatch Ale", "Steeleye Stout", "Inlagd Sill", "Gravad lax", "Côte de Blaye",
    "Chartreuse verte", "Boston Crab Meat", "Jack's New England Clam Chowder", "Singaporean Hokkien Fried Mee",
    "Ipoh Coffee", "Gula Malacca", "Rogede sild", "Spegesild", "Zaanse koeken", "Chocolade", "Maxilaku",
    "Valkoinen suklaa", "Manjimup Dried Apples", "Filo Mix", "Perth Pasties", "Tourtière", "Pâté chinois",
    "Gnocchi di nonna Alice", "Ravioli Angelo", "Escargots de Bourgogne", "Raclette Courdavault", "Camembert Pierrot",
    "Sirop d'érable", "Tarte au sucre", "Vegie-spread", "Wimmers gute Semmelknödel", "Louisiana Fiery Hot Pepper Sauce",
    "Louisiana Hot Spiced Okra", "Laughing Lumberjack Lager", "Scottish Longbreads", "Gudbrandsdalsost", "Outback Lager",
    "Flotemysost", "Mozzarella di Giovanni", "Röd Kaviar", "Longlife Tofu", "Rhönbräu Klosterbier", "Lakkalikööri",
    "Original Frankfurter grüne Soße"];
  var prices = [18, 19, 10, 22, 21.35, 25, 30, 40, 97, 31, 21, 38, 6, 23.25, 15.5, 17.45, 39, 62.5, 9.2, 81, 10,
    19.5, 9, 4.5, 14, 15.5, 43.9, 16.5, 12.9, 12.5, 9.4, 32, 2.5, 14, 18, 11.2, 26, 263.5, 18, 18.4, 9.65, 14, 46,
    12.5, 9.65, 9.5, 4.5, 12.75, 20, 10, 53, 7, 12.5, 7.45, 24, 15, 21.5, 55, 13, 34.8, 28.5, 49.3, 43.9, 2.5, 30.4,
    21.05, 13.25, 26, 8, 12.5, 36, 15, 25.89, 12, 18.5, 18];
  var units = ['10 boxes x 20 bags', '24 - 12 oz bottles', '12 - 550 ml bottles', '48 - 6 oz jars', '36 boxes',
    '12 - 8 oz jars', '12 - 1 lb pkgs.', '12 - 12 oz jars', '18 - 500 g pkgs.', '12 - 200 ml jars', '1 kg pkg.',
    '10 - 500 g pkgs.', '2 kg box', '5 kg pkg.', '24 - 250 g pkgs.', '12 - 355 ml cans'];
  var Products = { name: 'Products', columns: ['ProductID', 'ProductName', 'SupplierID', 'CategoryID', 'Unit', 'Price'], rows: [] };
  for (var p = 0; p < 77; p++) {
    Products.rows.push([p + 1, productNames[p], 1 + (p * 3) % 29, 1 + (p % 8), units[p % units.length], prices[p]]);
  }

  var shippers = [1, 2, 3];
  var Orders = { name: 'Orders', columns: ['OrderID', 'CustomerID', 'EmployeeID', 'OrderDate', 'ShipperID'], rows: [] };
  var OrderDetails = { name: 'OrderDetails', columns: ['OrderDetailID', 'OrderID', 'ProductID', 'Quantity'], rows: [] };
  var detailId = 1;
  for (var o = 0; o < 182; o++) {
    var orderId = 10248 + o;
    var custId = 1 + (o % 91);
    Orders.rows.push([orderId, custId, 1 + (o % 9), '1996-07-' + String(1 + (o % 28)).padStart(2, '0'), shippers[o % 3]]);
    var lines = 2 + (o % 2);
    for (var k = 0; k < lines; k++) {
      var qty = [5, 10, 12, 15, 20, 25, 30, 40, 50, 60][(o * 7 + k * 13) % 10];
      OrderDetails.rows.push([detailId++, orderId, 1 + ((o * 7 + k * 13) % 77), qty]);
    }
  }

  window.NW_DATA = {
    customers: Customers, products: Products, orders: Orders, orderDetails: OrderDetails
  };
  window.NW_TABLE_META = [
    { key: 'customers', table: 'Customers', cn: '客户表', desc: '共 91 个客户', cols: Customers.columns },
    { key: 'products', table: 'Products', cn: '产品表', desc: '共 77 种产品', cols: Products.columns },
    { key: 'orders', table: 'Orders', cn: '订单表', desc: '共 182 张订单', cols: Orders.columns },
    { key: 'orderDetails', table: 'OrderDetails', cn: '订单明细表', desc: '每张订单含 2~3 行明细', cols: OrderDetails.columns }
  ];
})();
