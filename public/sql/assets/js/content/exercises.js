// Practice exercises. Every solution is checked against the database by tools/validate.mjs.
// level: 1 warm-up, 2 solid, 3 boss. ordered: the row order is graded too.
// check: for data-changing exercises, a query whose result after her statement must match.

export const EXERCISES = [
  // ---------------- basics ----------------
  {
    id: 'b01', topic: 'basics', level: 1, title: 'Every genre',
    prompt: 'List the **name** of every genre in the store.',
    solution: `SELECT Name
FROM Genre;`,
    hints: ['Genres live in the `Genre` table.', '`SELECT column FROM table;` is the whole thing.'],
    explain: 'The simplest shape there is: one column, one table, no filter. If you wrote `SELECT *`, you got the GenreId too, and the checker counts extra columns as a different answer.',
  },
  {
    id: 'b02', topic: 'basics', level: 1, title: 'Led Zeppelin, alphabetically',
    prompt: 'Led Zeppelin is artist number 22 (`ArtistId = 22`). List the **title** of each of their albums, sorted alphabetically (A to Z).',
    solution: `SELECT Title
FROM Album
WHERE ArtistId = 22
ORDER BY Title;`,
    ordered: true,
    hints: ['Album titles are in `Album.Title`, and every album has an `ArtistId`.', 'Keep their albums with `WHERE ArtistId = 22`, then sort with `ORDER BY column` (ASC is the default).'],
    explain: '`ORDER BY Title` sorts ascending by default, so `ASC` is optional. ORDER BY always comes after WHERE. Without ORDER BY, SQL gives no guarantee about row order at all.',
  },
  {
    id: 'b03', topic: 'basics', level: 1, title: 'Customers by country',
    prompt: 'Show each customer\'s **country**, **last name** and **first name**, sorted by country (A to Z) and, within the same country, by last name (A to Z).',
    solution: `SELECT Country, LastName, FirstName
FROM Customer
ORDER BY Country, LastName;`,
    ordered: true,
    hints: ['Three columns from `Customer`.', 'ORDER BY can take several columns, separated by commas. The second one only breaks ties in the first.'],
    explain: '`ORDER BY Country, LastName` sorts by country first, and only customers from the same country get sorted by last name. With 13 customers in the USA and 8 in Canada, the second key has plenty of work to do.',
  },
  {
    id: 'b04', topic: 'basics', level: 1, title: 'Where our customers live',
    prompt: 'List each **country** that has at least one customer, **once**, sorted A to Z.',
    solution: `SELECT DISTINCT Country
FROM Customer
ORDER BY Country;`,
    ordered: true,
    hints: ['Countries are in `Customer.Country`, but many customers share a country.', '`SELECT DISTINCT` removes duplicate rows.'],
    explain: 'There are 59 customers but only 24 different countries. `DISTINCT` collapses identical rows. (A `GROUP BY Country` would work too.)',
  },
  {
    id: 'b05', topic: 'basics', level: 1, title: 'The ten longest tracks',
    prompt: 'Show the **name** and **Milliseconds** of the 10 longest tracks, longest first.',
    solution: `SELECT Name, Milliseconds
FROM Track
ORDER BY Milliseconds DESC
LIMIT 10;`,
    ordered: true,
    hints: ['Length is `Track.Milliseconds`.', 'Sort descending with `DESC`, then keep the first rows with `LIMIT`.'],
    explain: '`ORDER BY ... DESC LIMIT 10` is the classic top-N pattern. The longest "tracks" are actually TV episodes, mostly Battlestar Galactica: the top two run almost an hour and a half, the rest about 49 minutes each.',
  },
  {
    id: 'b06', topic: 'basics', level: 2, title: 'Minutes, not milliseconds',
    prompt: 'For the tracks on album number 1 (`AlbumId = 1`), show the track **name** and its length in **minutes**, rounded to **1 decimal**. Longest first, sorted by the exact length (`Milliseconds`).',
    solution: `SELECT Name, ROUND(Milliseconds / 60000, 1) AS Minutes
FROM Track
WHERE AlbumId = 1
ORDER BY Milliseconds DESC;`,
    ordered: true,
    hints: ['One minute is 60,000 milliseconds.', '`ROUND(x, 1)` keeps one decimal. You can give the column a name with `AS Minutes`.', 'Sort by `Milliseconds`, not by the rounded minutes: two tracks can round to the same number.'],
    explain: 'You can compute in the SELECT list: `Milliseconds / 60000`. In MySQL that division gives a decimal (not a whole number), and `ROUND(..., 1)` tidies it. Sort by the exact `Milliseconds`: *Evil Walks* (263,497 ms) and *Breaking The Rules* (263,288 ms) both round to 4.4 minutes, so `ORDER BY Minutes` can\'t tell them apart and puts them in either order.',
  },
  {
    id: 'b07', topic: 'basics', level: 1, title: 'Who works here',
    prompt: 'Show every employee\'s **first name**, **last name** and job **title**.',
    solution: `SELECT FirstName, LastName, Title
FROM Employee;`,
    hints: ['The table is `Employee`.', 'Here `Title` is the job title (not an album title).'],
    explain: 'Eight employees. Notice `Title` means something different here than in `Album`: same column name, different meaning. The table decides.',
  },
  {
    id: 'b08', topic: 'basics', level: 2, title: 'The five most recent invoices',
    prompt: 'Show the **InvoiceId**, **InvoiceDate** and **Total** of the 5 most recent invoices, newest first.',
    solution: `SELECT InvoiceId, InvoiceDate, Total
FROM Invoice
ORDER BY InvoiceDate DESC
LIMIT 5;`,
    ordered: true,
    hints: ['"Most recent" means the latest `InvoiceDate`.', 'Sort by date descending and `LIMIT 5`.'],
    explain: 'Dates sort chronologically, so `ORDER BY InvoiceDate DESC` puts the newest first. The newest invoice in Chinook is from 22 December 2025.',
  },
  {
    id: 'b09', topic: 'basics', level: 2, title: 'Page two',
    prompt: 'Imagine a list of all tracks sorted by **name** A to Z (ties broken by `TrackId`), shown 10 per page. Show page **two**: the **TrackId** and **name** of tracks 11 to 20.',
    solution: `SELECT TrackId, Name
FROM Track
ORDER BY Name, TrackId
LIMIT 10, 10;`,
    alt: `SELECT TrackId, Name
FROM Track
ORDER BY Name, TrackId
LIMIT 10 OFFSET 10;`,
    ordered: true,
    hints: ['You need to skip 10 rows, then take 10.', 'In MySQL: `LIMIT offset, count` or `LIMIT count OFFSET offset`.'],
    explain: '`LIMIT 10, 10` means "skip 10, then return 10". Careful with the order of the two numbers: in the comma form, the **offset comes first**. `LIMIT 10 OFFSET 10` says the same thing more readably.',
  },

  // ---------------- filter ----------------
  {
    id: 'f01', topic: 'filter', level: 1, title: 'Customers in Brazil',
    prompt: 'Show the **first name**, **last name** and **city** of customers who live in Brazil.',
    solution: `SELECT FirstName, LastName, City
FROM Customer
WHERE Country = 'Brazil';`,
    hints: ['Filter rows with `WHERE`.', "Text values go in single quotes: `'Brazil'`."],
    explain: "`WHERE Country = 'Brazil'` keeps only matching rows. In MySQL text comparison ignores case, so `'brazil'` would work too.",
  },
  {
    id: 'f02', topic: 'filter', level: 1, title: 'The pricier tracks',
    prompt: 'Show the **name** and **UnitPrice** of every track that costs more than 0.99.',
    solution: `SELECT Name, UnitPrice
FROM Track
WHERE UnitPrice > 0.99;`,
    hints: ['The price is `Track.UnitPrice`.', 'Use `>` in the WHERE clause.'],
    explain: 'Only two prices exist: 0.99 and 1.99 (videos). So this returns the 213 tracks priced at 1.99, which are all TV episodes (*Lost*, *The Office*, *Battlestar Galactica* and friends).',
  },
  {
    id: 'f03', topic: 'filter', level: 1, title: 'The "The" bands',
    prompt: 'List the **names** of artists whose name starts with the word **"The"** followed by a space (like *The Who*).',
    solution: `SELECT Name
FROM Artist
WHERE Name LIKE 'The %';`,
    hints: ['Pattern matching uses `LIKE`.', "`%` matches any text. Put the space before it: `'The %'`."],
    explain: "`LIKE 'The %'` means: starts with \"The \" and then anything. Without the space, `'The%'` would also match a band called *Theory*. Chinook happens to have no such band, so both give the same 14 artists here, but only the version with the space says what the question asks.",
  },
  {
    id: 'f04', topic: 'filter', level: 2, title: 'Long and anonymous',
    prompt: 'Show the **name** and **Milliseconds** of tracks that have **no composer** and are longer than **10 minutes**.',
    solution: `SELECT Name, Milliseconds
FROM Track
WHERE Composer IS NULL
  AND Milliseconds > 600000;`,
    hints: ['"No composer" means the Composer column is NULL.', '`= NULL` never matches anything. Use `IS NULL`.', 'Ten minutes is 600,000 milliseconds.'],
    explain: '`Composer = NULL` is never true (NULL is "unknown", and comparing to unknown gives unknown), so it would return nothing. `IS NULL` is the only way to test for it.',
  },
  {
    id: 'f05', topic: 'filter', level: 2, title: 'Three to four minutes of jazz',
    prompt: 'Jazz is genre number 2. Show the **name** and **Milliseconds** of jazz tracks that are between **3 and 4 minutes** long (both ends included).',
    solution: `SELECT Name, Milliseconds
FROM Track
WHERE GenreId = 2
  AND Milliseconds BETWEEN 180000 AND 240000;`,
    hints: ['3 minutes = 180000 ms, 4 minutes = 240000 ms.', '`BETWEEN a AND b` includes both a and b.'],
    explain: '`BETWEEN 180000 AND 240000` is the same as `>= 180000 AND <= 240000`. Both ends are included.',
  },
  {
    id: 'f06', topic: 'filter', level: 2, title: 'Business customers',
    prompt: 'Show the **first name**, **last name** and **company** of customers who have a company.',
    solution: `SELECT FirstName, LastName, Company
FROM Customer
WHERE Company IS NOT NULL;`,
    hints: ['Private customers have NULL in `Company`.', 'The opposite of `IS NULL` is `IS NOT NULL`.'],
    explain: 'Only 10 of the 59 customers have a company. `Company <> NULL` would return nothing, for the same reason `= NULL` does.',
  },
  {
    id: 'f07', topic: 'filter', level: 2, title: 'North America, M names',
    prompt: 'Show the **first name**, **last name** and **country** of customers from the **USA or Canada** whose last name starts with **M**.',
    solution: `SELECT FirstName, LastName, Country
FROM Customer
WHERE (Country = 'USA' OR Country = 'Canada')
  AND LastName LIKE 'M%';`,
    alt: `SELECT FirstName, LastName, Country
FROM Customer
WHERE Country IN ('USA', 'Canada')
  AND LastName LIKE 'M%';`,
    hints: ['Two conditions: the country one and the name one.', '`AND` is evaluated before `OR`. Use parentheses, or `IN (...)`.'],
    explain: "Without parentheses, `Country = 'USA' OR Country = 'Canada' AND LastName LIKE 'M%'` means \"every American, plus Canadians with M\". `AND` binds tighter than `OR`. Parentheses or `IN ('USA','Canada')` fix it.",
  },
  {
    id: 'f08', topic: 'filter', level: 2, title: 'Big invoices of 2023',
    prompt: 'Show the **InvoiceId**, **InvoiceDate** and **Total** of invoices from the year **2023** with a total **over 10**.',
    solution: `SELECT InvoiceId, InvoiceDate, Total
FROM Invoice
WHERE YEAR(InvoiceDate) = 2023
  AND Total > 10;`,
    alt: `SELECT InvoiceId, InvoiceDate, Total
FROM Invoice
WHERE InvoiceDate >= '2023-01-01' AND InvoiceDate < '2024-01-01'
  AND Total > 10;`,
    hints: ['`YEAR(InvoiceDate)` gives the year as a number.', 'Or use a date range: from 2023-01-01 up to (not including) 2024-01-01.'],
    explain: "`YEAR(InvoiceDate) = 2023` is the readable way. The range version (`>= '2023-01-01' AND < '2024-01-01'`) is the safe way when times are involved, because `BETWEEN '2023-01-01' AND '2023-12-31'` would miss anything later than midnight on 31 December.",
  },
  {
    id: 'f09', topic: 'filter', level: 1, title: 'The IT department',
    prompt: 'Show the **first name**, **last name** and **title** of employees whose title is either **IT Staff** or **IT Manager**.',
    solution: `SELECT FirstName, LastName, Title
FROM Employee
WHERE Title IN ('IT Staff', 'IT Manager');`,
    hints: ['Two allowed values: use `IN (...)` or two conditions with OR.'],
    explain: "`IN ('IT Staff', 'IT Manager')` is a neat way to write `Title = 'IT Staff' OR Title = 'IT Manager'`.",
  },
  {
    id: 'f10', topic: 'filter', level: 1, title: 'Gmail people',
    prompt: 'Show the **first name**, **last name** and **email** of customers with a **gmail.com** address.',
    solution: `SELECT FirstName, LastName, Email
FROM Customer
WHERE Email LIKE '%@gmail.com';`,
    hints: ["The email ends with `@gmail.com`, so the pattern starts with `%`."],
    explain: "`'%@gmail.com'` means \"anything, then @gmail.com at the very end\". Eight customers use Gmail.",
  },
  {
    id: 'f11', topic: 'filter', level: 2, title: 'Long "Love" tracks, not rock',
    prompt: 'Show the **name**, **GenreId** and **Milliseconds** of tracks that are **not** rock (genre 1), are longer than **5 minutes**, and whose name contains **"Love"**.',
    solution: `SELECT Name, GenreId, Milliseconds
FROM Track
WHERE GenreId <> 1
  AND Milliseconds > 300000
  AND Name LIKE '%Love%';`,
    hints: ['"Not equal" is `<>` (or `!=`).', 'Five minutes is 300000 ms.', "Contains: `LIKE '%Love%'`."],
    explain: 'Three conditions joined by AND. `%Love%` matches anywhere in the name, so *Turbo Lover* and *Loverman* count too: LIKE matches letters, not whole words.',
  },

  // ---------------- agg ----------------
  {
    id: 'a01', topic: 'agg', level: 1, title: 'How many tracks?',
    prompt: 'How many tracks are in the database? Return a single number.',
    solution: `SELECT COUNT(*)
FROM Track;`,
    hints: ['Counting rows is `COUNT(*)`.'],
    explain: '`COUNT(*)` counts rows, whatever is in them. 3,503 tracks.',
  },
  {
    id: 'a02', topic: 'agg', level: 1, title: 'All-time revenue',
    prompt: 'What is the **total revenue** of the store, i.e. the sum of all invoice totals? Round to 2 decimals.',
    solution: `SELECT ROUND(SUM(Total), 2) AS Revenue
FROM Invoice;`,
    hints: ['Each invoice has a `Total`.', '`SUM(...)` adds a column up, `ROUND(x, 2)` keeps 2 decimals.'],
    explain: '`SUM(Total)` over all 412 invoices: 2,328.60.',
  },
  {
    id: 'a03', topic: 'agg', level: 2, title: 'Jazz in seconds',
    prompt: 'For jazz tracks (genre 2), show the **shortest**, **longest** and **average** length in **seconds**, each rounded to whole seconds.',
    solution: `SELECT ROUND(MIN(Milliseconds) / 1000) AS Shortest,
       ROUND(MAX(Milliseconds) / 1000) AS Longest,
       ROUND(AVG(Milliseconds) / 1000) AS Average
FROM Track
WHERE GenreId = 2;`,
    hints: ['`MIN`, `MAX`, `AVG` work on the rows left after WHERE.', 'Seconds = milliseconds / 1000. `ROUND(x)` rounds to a whole number.'],
    explain: 'Aggregates run on whatever survives the WHERE. You can do math around them (`AVG(x) / 1000`) or inside them (`AVG(x / 1000)`), same result.',
  },
  {
    id: 'a04', topic: 'agg', level: 2, title: 'Composer or not',
    prompt: 'In one row, show how many tracks **have** a composer and how many **don\'t**.',
    solution: `SELECT COUNT(Composer) AS WithComposer,
       COUNT(*) - COUNT(Composer) AS WithoutComposer
FROM Track;`,
    alt: `SELECT SUM(Composer IS NOT NULL) AS WithComposer,
       SUM(Composer IS NULL) AS WithoutComposer
FROM Track;`,
    hints: ['`COUNT(column)` skips NULLs, `COUNT(*)` does not.', 'The difference between them is the number of NULLs.'],
    explain: '`COUNT(Composer)` = 2,526 (only non-NULL values). `COUNT(*)` = 3,503 (all rows). The difference, 977, is the tracks without a composer. This NULL behaviour is a favourite exam question.',
  },
  {
    id: 'a05', topic: 'agg', level: 1, title: 'How many countries buy?',
    prompt: 'How many **different billing countries** appear on invoices? One number.',
    solution: `SELECT COUNT(DISTINCT BillingCountry)
FROM Invoice;`,
    hints: ['Counting different values is `COUNT(DISTINCT column)`.'],
    explain: '`COUNT(BillingCountry)` would count all 412 invoices. `COUNT(DISTINCT ...)` counts each country once: 24.',
  },
  {
    id: 'a06', topic: 'agg', level: 2, title: '2024 in one line',
    prompt: 'For invoices from **2024**, show in one row: the **number of invoices**, the **total revenue**, and the **average invoice total** rounded to 2 decimals.',
    solution: `SELECT COUNT(*) AS Invoices,
       SUM(Total) AS Revenue,
       ROUND(AVG(Total), 2) AS AverageTotal
FROM Invoice
WHERE YEAR(InvoiceDate) = 2024;`,
    hints: ['Filter the year first with WHERE.', 'Then three aggregates side by side: COUNT, SUM, AVG.'],
    explain: 'Several aggregates can sit in one SELECT. With no GROUP BY, the whole filtered table is one group, so you get one row.',
  },
  {
    id: 'a07', topic: 'agg', level: 2, title: 'Gigabytes of music',
    prompt: 'How much storage do all the tracks take together, in **gigabytes**? (1 GB = 1024 × 1024 × 1024 bytes.) Round to 2 decimals.',
    solution: `SELECT ROUND(SUM(Bytes) / (1024 * 1024 * 1024), 2) AS GB
FROM Track;`,
    hints: ['File size is `Track.Bytes`.', 'Sum first, then divide by 1024 three times.'],
    explain: 'About 109 GB, mostly the TV episodes. Parentheses matter: `SUM(Bytes) / 1024 * 1024 * 1024` would divide once and then multiply twice.',
  },

  // ---------------- group ----------------
  {
    id: 'g01', topic: 'group', level: 1, title: 'Tracks per genre number',
    prompt: 'For each **GenreId**, show how many tracks it has.',
    solution: `SELECT GenreId, COUNT(*) AS Tracks
FROM Track
GROUP BY GenreId;`,
    hints: ['"For each X" usually means `GROUP BY X`.', 'Select the grouping column and the count.'],
    explain: '`GROUP BY GenreId` makes one group per genre, and `COUNT(*)` counts the rows in each group.',
  },
  {
    id: 'g02', topic: 'group', level: 2, title: 'Customers per country',
    prompt: 'For each country, show the **country** and its **number of customers**. Most customers first; countries with the same number in A to Z order.',
    solution: `SELECT Country, COUNT(*) AS Customers
FROM Customer
GROUP BY Country
ORDER BY Customers DESC, Country;`,
    ordered: true,
    hints: ['GROUP BY Country, COUNT(*).', 'Two sort keys: the count (descending), then the country (ascending).'],
    explain: 'You can ORDER BY an aggregate or its alias. The second key only matters for ties, and there are lots of countries with 1 or 2 customers.',
  },
  {
    id: 'g03', topic: 'group', level: 2, title: 'Revenue by year',
    prompt: 'Show each **year** and the **total revenue** of that year (sum of invoice totals, 2 decimals), in chronological order.',
    solution: `SELECT YEAR(InvoiceDate) AS Year, ROUND(SUM(Total), 2) AS Revenue
FROM Invoice
GROUP BY YEAR(InvoiceDate)
ORDER BY Year;`,
    ordered: true,
    hints: ['Group by `YEAR(InvoiceDate)`. You can group by an expression.', 'Sum the Total of each group.'],
    explain: 'GROUP BY can take an expression like `YEAR(InvoiceDate)`. In MySQL you may also write `GROUP BY Year` (the alias). 2022 was the best year. Keep the ORDER BY even when the rows already come out sorted: GROUP BY does not promise any order in MySQL 8, so without ORDER BY the order is luck.',
  },
  {
    id: 'g04', topic: 'group', level: 2, title: 'Big spenders',
    prompt: 'Show the **CustomerId** and **total amount spent** by customers who spent **more than 45** in total.',
    solution: `SELECT CustomerId, SUM(Total) AS Spent
FROM Invoice
GROUP BY CustomerId
HAVING SUM(Total) > 45;`,
    hints: ['Group the invoices by customer and sum them.', 'Filtering on a SUM is a job for `HAVING`, not WHERE.'],
    explain: 'WHERE runs before grouping, so it can\'t see `SUM(Total)`. HAVING filters the groups after they are built. Five customers spent over 45.',
  },
  {
    id: 'g05', topic: 'group', level: 2, title: 'Long albums',
    prompt: 'Show the **AlbumId** and **number of tracks** of albums that have **more than 25** tracks.',
    solution: `SELECT AlbumId, COUNT(*) AS Tracks
FROM Track
GROUP BY AlbumId
HAVING COUNT(*) > 25;`,
    hints: ['Group the tracks by album.', 'Keep only big groups with `HAVING COUNT(*) > 25`.'],
    explain: 'Count per album, then HAVING throws away the groups that are too small.',
  },
  {
    id: 'g06', topic: 'group', level: 2, title: 'Month by month, 2022',
    prompt: 'For **2022**, show each **month number** (1 to 12) and the **number of invoices** in that month, in month order.',
    solution: `SELECT MONTH(InvoiceDate) AS Month, COUNT(*) AS Invoices
FROM Invoice
WHERE YEAR(InvoiceDate) = 2022
GROUP BY MONTH(InvoiceDate)
ORDER BY Month;`,
    ordered: true,
    hints: ['Filter the year with WHERE first.', 'Then group by `MONTH(InvoiceDate)`.'],
    explain: 'WHERE narrows to 2022 before grouping, then GROUP BY makes 12 groups. The store is very regular: about 7 invoices a month.',
  },
  {
    id: 'g07', topic: 'group', level: 3, title: 'Countries that order a lot',
    prompt: 'For billing countries with **more than 20 invoices**, show the **country**, the **number of invoices** and the **average invoice total** (2 decimals). Most invoices first; countries with the same number in A to Z order.',
    solution: `SELECT BillingCountry, COUNT(*) AS Invoices, ROUND(AVG(Total), 2) AS AvgTotal
FROM Invoice
GROUP BY BillingCountry
HAVING COUNT(*) > 20
ORDER BY Invoices DESC, BillingCountry;`,
    ordered: true,
    hints: ['Group invoices by `BillingCountry`.', 'HAVING on the count, ORDER BY the count descending, then the country.'],
    explain: 'Every clause in its place: GROUP BY builds the groups, HAVING filters them, SELECT computes per group, ORDER BY sorts the result. The second sort key matters here: Brazil and France both have 35 invoices, and without it their order would be up to the database.',
  },
  {
    id: 'g08', topic: 'group', level: 2, title: 'Busy composers',
    prompt: 'Show each **composer** (exactly as written in `Track.Composer`) that appears on at least **20 tracks**, with their **number of tracks**. Most tracks first, ties in A to Z order of composer.',
    solution: `SELECT Composer, COUNT(*) AS Tracks
FROM Track
WHERE Composer IS NOT NULL
GROUP BY Composer
HAVING COUNT(*) >= 20
ORDER BY Tracks DESC, Composer;`,
    ordered: true,
    hints: ['Group by Composer.', 'NULL forms its own group, which has way more than 20 rows. Filter it out with WHERE.', 'At least 20 means `>= 20`.'],
    explain: 'The trap: tracks without a composer all land in one NULL group with 977 rows, which passes `>= 20`. `WHERE Composer IS NOT NULL` removes them before grouping. Steve Harris (Iron Maiden) wins by a mile.',
  },
  {
    id: 'g09', topic: 'group', level: 2, title: 'Prices per media type',
    prompt: 'For each **MediaTypeId**, show the **number of tracks**, the **lowest** price and the **highest** price.',
    solution: `SELECT MediaTypeId, COUNT(*) AS Tracks, MIN(UnitPrice) AS MinPrice, MAX(UnitPrice) AS MaxPrice
FROM Track
GROUP BY MediaTypeId;`,
    hints: ['One group per media type.', 'Three aggregates per group.'],
    explain: 'Each group can carry any number of aggregates. Media type 3 (video) is the only one that reaches 1.99, and one of its tracks is still 0.99.',
  },
  {
    id: 'g10', topic: 'group', level: 3, title: 'Active customers per year',
    prompt: 'For each **year**, how many **different customers** bought something? Show the year and the count, in year order.',
    solution: `SELECT YEAR(InvoiceDate) AS Year, COUNT(DISTINCT CustomerId) AS Customers
FROM Invoice
GROUP BY YEAR(InvoiceDate)
ORDER BY Year;`,
    ordered: true,
    hints: ['Group by year.', 'A customer with 3 invoices in a year should count once: `COUNT(DISTINCT ...)`.'],
    explain: '`COUNT(*)` would count invoices (83 in most years). `COUNT(DISTINCT CustomerId)` counts people.',
  },
  {
    id: 'g11', topic: 'group', level: 3, title: 'Albums with an average over 5 minutes',
    prompt: 'Show the **AlbumId**, **number of tracks** and **average track length in minutes** (2 decimals) for albums whose tracks average **more than 5 minutes** and that have **at least 10 tracks**. Longest average first, sorted by the exact (unrounded) average.',
    solution: `SELECT AlbumId, COUNT(*) AS Tracks, ROUND(AVG(Milliseconds) / 60000, 2) AS AvgMinutes
FROM Track
GROUP BY AlbumId
HAVING AVG(Milliseconds) > 300000 AND COUNT(*) >= 10
ORDER BY AVG(Milliseconds) DESC;`,
    ordered: true,
    hints: ['Group by album.', 'HAVING can combine two conditions with AND.', 'Five minutes is 300000 ms.', 'Sort by `AVG(Milliseconds)`, not by the rounded alias.'],
    explain: 'HAVING can test several aggregates at once. Sorting by the unrounded `AVG(Milliseconds)` avoids ties caused by rounding: albums 256 and 153 both show 5.85, for example, and `ORDER BY AvgMinutes` would put them in either order.',
  },

  // ---------------- join ----------------
  {
    id: 'j01', topic: 'join', level: 1, title: 'Albums with their artists',
    prompt: 'Show every album **title** next to its **artist name**.',
    solution: `SELECT al.Title, ar.Name
FROM Album al
JOIN Artist ar ON ar.ArtistId = al.ArtistId;`,
    hints: ['Album has `ArtistId`, Artist has the name.', '`JOIN Artist ar ON ar.ArtistId = al.ArtistId`'],
    explain: 'The JOIN matches each album to the artist with the same ArtistId. Aliases (`al`, `ar`) keep it short and readable.',
  },
  {
    id: 'j02', topic: 'join', level: 1, title: "AC/DC's albums",
    prompt: 'List the **titles** of all albums by **AC/DC**.',
    solution: `SELECT al.Title
FROM Album al
JOIN Artist ar ON ar.ArtistId = al.ArtistId
WHERE ar.Name = 'AC/DC';`,
    hints: ['You know the artist name, not its id. Join Album to Artist.', "Then filter: `WHERE ar.Name = 'AC/DC'`."],
    explain: 'Join first, then filter on a column from the other table. (You could also look up the id with a subquery.)',
  },
  {
    id: 'j03', topic: 'join', level: 2, title: 'Queen, in detail',
    prompt: 'For every track by the artist **Queen**, show the **track name**, the **album title** and the **genre name**.',
    solution: `SELECT t.Name AS Track, al.Title AS Album, g.Name AS Genre
FROM Track t
JOIN Album al ON al.AlbumId = t.AlbumId
JOIN Artist ar ON ar.ArtistId = al.ArtistId
JOIN Genre g ON g.GenreId = t.GenreId
WHERE ar.Name = 'Queen';`,
    hints: ['Four tables: Track, Album, Artist, Genre.', 'Track → Album → Artist for the filter, Track → Genre for the genre name.', 'Track, Artist and Genre all have a column called Name. Use the alias every time.'],
    explain: 'A chain of joins. The classic trap is `Name`: it exists in Track, Artist and Genre, so a bare `Name` is ambiguous. Prefix everything.',
  },
  {
    id: 'j04', topic: 'join', level: 2, title: "Who's my rep?",
    prompt: 'For customers in **Germany**, show the customer\'s **first and last name** and their support rep\'s **first and last name**.',
    solution: `SELECT c.FirstName, c.LastName, e.FirstName AS RepFirstName, e.LastName AS RepLastName
FROM Customer c
JOIN Employee e ON e.EmployeeId = c.SupportRepId
WHERE c.Country = 'Germany';`,
    hints: ['The rep is an Employee.', 'The link is `Customer.SupportRepId = Employee.EmployeeId`.'],
    explain: 'The foreign key has a different name than the primary key it points to: `SupportRepId` → `EmployeeId`. Exams love this.',
  },
  {
    id: 'j05', topic: 'join', level: 2, title: 'Tracks per genre, by name',
    prompt: 'For each genre, show the **genre name** and its **number of tracks**. Most tracks first; genres with the same number in A to Z order.',
    solution: `SELECT g.Name AS Genre, COUNT(*) AS Tracks
FROM Genre g
JOIN Track t ON t.GenreId = g.GenreId
GROUP BY g.GenreId, g.Name
ORDER BY Tracks DESC, g.Name;`,
    ordered: true,
    hints: ['Join Genre and Track, then group.', 'Group by the genre (id and name).', 'Two sort keys: the count (descending), then the name.'],
    explain: 'Join, then group. Grouping by `g.GenreId, g.Name` is the safe habit: two genres could share a name, ids never do. Rock has 1,297 tracks. The name tiebreak matters: Heavy Metal and World both have 28.',
  },
  {
    id: 'j06', topic: 'join', level: 2, title: 'Sales per rep',
    prompt: 'For each support rep, show their **first name**, **last name** and the **total sales** of their customers (sum of invoice totals, 2 decimals). Highest first.',
    solution: `SELECT e.FirstName, e.LastName, ROUND(SUM(i.Total), 2) AS Sales
FROM Employee e
JOIN Customer c ON c.SupportRepId = e.EmployeeId
JOIN Invoice i ON i.CustomerId = c.CustomerId
GROUP BY e.EmployeeId, e.FirstName, e.LastName
ORDER BY Sales DESC;`,
    ordered: true,
    hints: ['Path: Employee → Customer (SupportRepId) → Invoice.', 'Group by the employee, sum the totals.'],
    explain: 'Three tables, one group per employee. Only the three Sales Support Agents appear: an INNER JOIN drops employees without customers.',
  },
  {
    id: 'j07', topic: 'join', level: 3, title: 'Best-selling artists',
    prompt: 'Show the **top 5 artists** by number of tracks sold (each invoice line is one track sold): the **artist name** and **tracks sold**, best first.',
    solution: `SELECT ar.Name, COUNT(*) AS TracksSold
FROM InvoiceLine il
JOIN Track t ON t.TrackId = il.TrackId
JOIN Album al ON al.AlbumId = t.AlbumId
JOIN Artist ar ON ar.ArtistId = al.ArtistId
GROUP BY ar.ArtistId, ar.Name
ORDER BY TracksSold DESC
LIMIT 5;`,
    ordered: true,
    hints: ['From sales to artists: InvoiceLine → Track → Album → Artist.', 'Group by artist, count the lines, sort, LIMIT 5.'],
    explain: 'The longest join path in Chinook. Count InvoiceLine rows per artist (or `SUM(il.Quantity)`, which is the same here because every quantity is 1). Iron Maiden sells the most.',
  },
  {
    id: 'j08', topic: 'join', level: 2, title: 'The Grunge playlist',
    prompt: 'Show the **track name** and **artist name** of every track on the playlist called **Grunge**.',
    solution: `SELECT t.Name AS Track, ar.Name AS Artist
FROM Playlist p
JOIN PlaylistTrack pt ON pt.PlaylistId = p.PlaylistId
JOIN Track t ON t.TrackId = pt.TrackId
JOIN Album al ON al.AlbumId = t.AlbumId
JOIN Artist ar ON ar.ArtistId = al.ArtistId
WHERE p.Name = 'Grunge';`,
    hints: ['Playlists and tracks are many-to-many, through `PlaylistTrack`.', 'Playlist → PlaylistTrack → Track → Album → Artist.'],
    explain: 'The bridge table `PlaylistTrack` has one row per (playlist, track) pair. You pass through it on the way from Playlist to Track.',
  },
  {
    id: 'j09', topic: 'join', level: 2, title: 'Everyone and their manager',
    prompt: 'Show every employee\'s **first and last name** with their manager\'s **first and last name**. The boss has no manager; keep them in the list (with NULLs).',
    solution: `SELECT e.FirstName, e.LastName, m.FirstName AS ManagerFirstName, m.LastName AS ManagerLastName
FROM Employee e
LEFT JOIN Employee m ON m.EmployeeId = e.ReportsTo;`,
    hints: ['The manager is also in the Employee table: join Employee to itself with two aliases.', '`e.ReportsTo` holds the manager\'s EmployeeId.', 'An INNER JOIN would drop the boss. Which join keeps them?'],
    explain: 'A self join: the same table twice, once as the employee (`e`) and once as the manager (`m`). LEFT JOIN keeps Andrew Adams, whose ReportsTo is NULL.',
  },
  {
    id: 'j10', topic: 'join', level: 2, title: 'Artists with no albums',
    prompt: 'List the **names** of artists that have **no albums** in the store.',
    solution: `SELECT ar.Name
FROM Artist ar
LEFT JOIN Album al ON al.ArtistId = ar.ArtistId
WHERE al.AlbumId IS NULL;`,
    alt: `SELECT Name
FROM Artist ar
WHERE NOT EXISTS (SELECT 1 FROM Album al WHERE al.ArtistId = ar.ArtistId);`,
    hints: ['A LEFT JOIN keeps artists even when no album matches.', 'For those artists, every Album column comes back NULL. Filter on that.'],
    explain: 'The "anti-join": `LEFT JOIN ... WHERE right.id IS NULL` finds rows with no partner. 71 artists. `NOT EXISTS` and `NOT IN` work too.',
  },
  {
    id: 'j11', topic: 'join', level: 2, title: 'Never sold',
    prompt: 'How many tracks have **never been sold**? One number.',
    solution: `SELECT COUNT(*)
FROM Track t
LEFT JOIN InvoiceLine il ON il.TrackId = t.TrackId
WHERE il.InvoiceLineId IS NULL;`,
    alt: `SELECT COUNT(*)
FROM Track
WHERE TrackId NOT IN (SELECT TrackId FROM InvoiceLine);`,
    hints: ['Sold tracks appear in InvoiceLine.', 'LEFT JOIN from Track and keep the rows where nothing matched.'],
    explain: '1,519 tracks were never bought. Same anti-join pattern: LEFT JOIN, then `IS NULL` on the right side.',
  },
  {
    id: 'j12', topic: 'join', level: 3, title: 'The empty playlists',
    prompt: 'Show the **PlaylistId** and **name** of playlists that contain **no tracks**.',
    solution: `SELECT p.PlaylistId, p.Name
FROM Playlist p
LEFT JOIN PlaylistTrack pt ON pt.PlaylistId = p.PlaylistId
WHERE pt.PlaylistId IS NULL;`,
    alt: `SELECT p.PlaylistId, p.Name
FROM Playlist p
LEFT JOIN PlaylistTrack pt ON pt.PlaylistId = p.PlaylistId
GROUP BY p.PlaylistId, p.Name
HAVING COUNT(pt.TrackId) = 0;`,
    hints: ['Tracks per playlist live in PlaylistTrack.', 'LEFT JOIN + IS NULL, or LEFT JOIN + GROUP BY + `HAVING COUNT(pt.TrackId) = 0`.'],
    explain: 'Four empty playlists. If you went the GROUP BY way, note `COUNT(pt.TrackId)` and not `COUNT(*)`: COUNT(*) would count the NULL row and say 1.',
  },
  {
    id: 'j13', topic: 'join', level: 2, title: 'Tracks per format',
    prompt: 'For each media type, show its **name** and its **number of tracks**.',
    solution: `SELECT mt.Name, COUNT(*) AS Tracks
FROM MediaType mt
JOIN Track t ON t.MediaTypeId = mt.MediaTypeId
GROUP BY mt.MediaTypeId, mt.Name;`,
    hints: ['Join MediaType to Track, group by the media type.'],
    explain: 'Same shape as tracks per genre: join the lookup table for the name, group, count.',
  },
  {
    id: 'j14', topic: 'join', level: 3, title: 'Who bought videos',
    prompt: 'Show the **first and last name** of every customer who bought at least one track of media type **"Protected MPEG-4 video file"**. Each customer once.',
    solution: `SELECT DISTINCT c.FirstName, c.LastName
FROM Customer c
JOIN Invoice i ON i.CustomerId = c.CustomerId
JOIN InvoiceLine il ON il.InvoiceId = i.InvoiceId
JOIN Track t ON t.TrackId = il.TrackId
JOIN MediaType mt ON mt.MediaTypeId = t.MediaTypeId
WHERE mt.Name = 'Protected MPEG-4 video file';`,
    hints: ['Customer → Invoice → InvoiceLine → Track → MediaType.', 'A customer who bought 5 videos appears 5 times. Fix with DISTINCT.'],
    explain: 'Joins multiply rows: one row per matching invoice line. `DISTINCT` collapses them back to one per customer. (An `EXISTS` subquery avoids the duplication altogether.)',
  },
  {
    id: 'j15', topic: 'join', level: 2, title: 'What Heather listened to',
    prompt: 'Which **genres** did the customer **Heather Leacock** buy? Show each genre **name** once.',
    solution: `SELECT DISTINCT g.Name
FROM Customer c
JOIN Invoice i ON i.CustomerId = c.CustomerId
JOIN InvoiceLine il ON il.InvoiceId = i.InvoiceId
JOIN Track t ON t.TrackId = il.TrackId
JOIN Genre g ON g.GenreId = t.GenreId
WHERE c.FirstName = 'Heather' AND c.LastName = 'Leacock';`,
    hints: ['Customer → Invoice → InvoiceLine → Track → Genre.', 'Filter on both names: first and last.', 'She bought many tracks of the same genre. Each genre should appear once.'],
    explain: 'Five tables, four joins, one filter, DISTINCT at the end. Long chains are just the same step repeated. She bought 38 tracks across 8 genres.',
  },
  {
    id: 'j16', topic: 'join', level: 3, title: 'Revenue per genre',
    prompt: 'For each genre that sold at least one track, show the **genre name** and the **revenue** it brought in (sum of `UnitPrice * Quantity` over invoice lines, 2 decimals). Highest revenue first; genres with the same revenue in A to Z order.',
    solution: `SELECT g.Name AS Genre, ROUND(SUM(il.UnitPrice * il.Quantity), 2) AS Revenue
FROM InvoiceLine il
JOIN Track t ON t.TrackId = il.TrackId
JOIN Genre g ON g.GenreId = t.GenreId
GROUP BY g.GenreId, g.Name
ORDER BY Revenue DESC, g.Name;`,
    ordered: true,
    hints: ['Money per line is on InvoiceLine. The genre is on Track.', 'Use `il.UnitPrice` (what was paid), not `t.UnitPrice` (the list price).', 'Sort by the revenue (descending), then by the genre name.'],
    explain: 'Revenue comes from InvoiceLine. In this data both prices are equal, but on an exam `InvoiceLine.UnitPrice * Quantity` is the correct answer. Opera never sold, so it doesn\'t appear (INNER JOIN). Ties really happen here: Classical and R&B/Soul both made 40.59.',
  },
  {
    id: 'j17', topic: 'join', level: 3, title: 'Every genre, even the unsold',
    prompt: 'Show **every** genre **name** with its number of **tracks sold** (invoice lines). Genres that never sold should show **0**. Most sold first, ties A to Z by genre name.',
    solution: `SELECT g.Name, COUNT(il.InvoiceLineId) AS Sold
FROM Genre g
LEFT JOIN Track t ON t.GenreId = g.GenreId
LEFT JOIN InvoiceLine il ON il.TrackId = t.TrackId
GROUP BY g.GenreId, g.Name
ORDER BY Sold DESC, g.Name;`,
    ordered: true,
    hints: ['To keep genres with no sales, every join along the way must be a LEFT JOIN.', 'Count a column from InvoiceLine, not `*`.'],
    explain: 'Two traps in one. An INNER JOIN anywhere in the chain drops Opera. And `COUNT(*)` would count Opera\'s NULL row as 1; `COUNT(il.InvoiceLineId)` correctly gives 0.',
  },

  // ---------------- subq ----------------
  {
    id: 's01', topic: 'subq', level: 2, title: 'Longer than average',
    prompt: 'Show the **name** and **Milliseconds** of jazz tracks (genre 2) that are longer than the **average length of all tracks** in the store.',
    solution: `SELECT Name, Milliseconds
FROM Track
WHERE GenreId = 2
  AND Milliseconds > (SELECT AVG(Milliseconds) FROM Track);`,
    hints: ['You can\'t write `AVG()` inside WHERE directly.', 'Compute the average in a subquery: `(SELECT AVG(Milliseconds) FROM Track)`.'],
    explain: 'A scalar subquery returns a single value, so you can compare to it with `>`. Note the average is over *all* tracks, not just jazz: the subquery has no WHERE.',
  },
  {
    id: 's02', topic: 'subq', level: 2, title: 'The biggest invoice',
    prompt: 'Show the **InvoiceId**, **CustomerId** and **Total** of the invoice(s) with the **highest total**. If several share the top total, show them all.',
    solution: `SELECT InvoiceId, CustomerId, Total
FROM Invoice
WHERE Total = (SELECT MAX(Total) FROM Invoice);`,
    hints: ['Find the max with a subquery, then the invoices equal to it.', '`ORDER BY Total DESC LIMIT 1` would hide ties.'],
    explain: '`= (SELECT MAX(...))` returns every row at the top, ties included. `LIMIT 1` only works when you know there are no ties.',
  },
  {
    id: 's03', topic: 'subq', level: 2, title: 'Quiet in 2025',
    prompt: 'Show the **first and last name** of customers who did **not buy anything in 2025**.',
    solution: `SELECT FirstName, LastName
FROM Customer
WHERE CustomerId NOT IN (
  SELECT CustomerId FROM Invoice WHERE YEAR(InvoiceDate) = 2025
);`,
    alt: `SELECT FirstName, LastName
FROM Customer c
WHERE NOT EXISTS (
  SELECT 1 FROM Invoice i
  WHERE i.CustomerId = c.CustomerId AND YEAR(i.InvoiceDate) = 2025
);`,
    hints: ['First think: who **did** buy in 2025? That\'s a subquery on Invoice.', 'Then take everyone **NOT IN** that list (or use NOT EXISTS).'],
    explain: '`NOT IN (subquery)` keeps customers whose id is not in the 2025 buyer list. A plain `WHERE YEAR(...) <> 2025` on a join would be wrong: it finds customers with *some* non-2025 invoice, which here is all 59 of them.',
  },
  {
    id: 's04', topic: 'subq', level: 2, title: 'Greatest hits artists',
    prompt: 'List the **names** of artists who have at least one album with **"Greatest"** in the title.',
    solution: `SELECT Name
FROM Artist
WHERE ArtistId IN (SELECT ArtistId FROM Album WHERE Title LIKE '%Greatest%');`,
    alt: `SELECT DISTINCT ar.Name
FROM Artist ar
JOIN Album al ON al.ArtistId = ar.ArtistId
WHERE al.Title LIKE '%Greatest%';`,
    hints: ['A subquery can return a list of ArtistIds.', '`WHERE ArtistId IN (SELECT ArtistId FROM Album WHERE ...)`'],
    explain: 'IN with a subquery never duplicates the outer rows, even if an artist has two "Greatest" albums. The JOIN version needs DISTINCT for that.',
  },
  {
    id: 's05', topic: 'subq', level: 3, title: 'Above their country\'s average',
    prompt: 'Show the **InvoiceId**, **BillingCountry** and **Total** of invoices whose total is **higher than the average total of invoices from the same billing country**.',
    solution: `SELECT i.InvoiceId, i.BillingCountry, i.Total
FROM Invoice i
WHERE i.Total > (
  SELECT AVG(i2.Total)
  FROM Invoice i2
  WHERE i2.BillingCountry = i.BillingCountry
);`,
    hints: ['The average is different for every country, so the subquery must know which country the current row is from.', 'Give the outer table an alias and refer to it inside: `WHERE i2.BillingCountry = i.BillingCountry`.'],
    explain: 'A **correlated** subquery: it runs once per outer row, using that row\'s country. Two aliases of the same table (`i` and `i2`) keep them apart.',
  },
  {
    id: 's06', topic: 'subq', level: 3, title: 'Invoices per customer, on average',
    prompt: 'On average, how many invoices does a customer have? Compute it **from the per-customer counts** (a derived table), rounded to 2 decimals.',
    solution: `SELECT ROUND(AVG(n), 2) AS AvgInvoices
FROM (
  SELECT CustomerId, COUNT(*) AS n
  FROM Invoice
  GROUP BY CustomerId
) AS per_customer;`,
    hints: ['Step 1: a query that counts invoices per customer.', 'Step 2: put it in FROM, give it an alias, and take AVG of the count.', 'Aggregates can\'t be nested directly: `AVG(COUNT(*))` is an error.'],
    explain: 'A derived table (subquery in FROM) lets you aggregate an aggregate. MySQL requires the alias (`AS per_customer`). The answer, 6.98, equals 412 / 59.',
  },
  {
    id: 's07', topic: 'subq', level: 3, title: 'Top spender in each country',
    prompt: 'For each country, show the **country**, **first name**, **last name** and **total spent** of the customer who spent the most there. If several customers tie for the top in a country, show all of them.',
    solution: `SELECT c.Country, c.FirstName, c.LastName, SUM(i.Total) AS Spent
FROM Customer c
JOIN Invoice i ON i.CustomerId = c.CustomerId
GROUP BY c.CustomerId, c.Country, c.FirstName, c.LastName
HAVING SUM(i.Total) = (
  SELECT MAX(s.Spent)
  FROM (
    SELECT c2.Country, SUM(i2.Total) AS Spent
    FROM Customer c2
    JOIN Invoice i2 ON i2.CustomerId = c2.CustomerId
    GROUP BY c2.CustomerId, c2.Country
  ) AS s
  WHERE s.Country = c.Country
);`,
    hints: ['First get each customer\'s total (group by customer).', 'Keep a customer if their total equals the **max total within their country**.', 'That max needs a derived table of per-customer totals, filtered to the outer row\'s country.'],
    explain: 'The "best per group" pattern without window functions: per-customer totals, then compare to the max per country with a correlated subquery. Countries with a single customer simply return that customer, and the United Kingdom returns three (Emma Jones, Phil Hughes and Steve Murray all spent 37.62): 26 rows in all.',
  },
  {
    id: 's08', topic: 'subq', level: 2, title: 'Longer than every jazz track',
    prompt: 'Show the **name** and **Milliseconds** of tracks that are longer than **every** jazz track (genre 2).',
    solution: `SELECT Name, Milliseconds
FROM Track
WHERE Milliseconds > ALL (SELECT Milliseconds FROM Track WHERE GenreId = 2);`,
    alt: `SELECT Name, Milliseconds
FROM Track
WHERE Milliseconds > (SELECT MAX(Milliseconds) FROM Track WHERE GenreId = 2);`,
    hints: ['"Longer than every one of them" = longer than the longest one.', 'Either `> ALL (subquery)` or `> (SELECT MAX(...))`.'],
    explain: '`> ALL (...)` is true when the value beats every value in the list. It\'s equivalent to beating the MAX. Both are fine on the exam.',
  },
  {
    id: 's09', topic: 'subq', level: 3, title: 'The busiest rep',
    prompt: 'Show the **first and last name** of the employee who is support rep for the **most customers**.',
    solution: `SELECT FirstName, LastName
FROM Employee
WHERE EmployeeId IN (
  SELECT SupportRepId
  FROM Customer
  GROUP BY SupportRepId
  HAVING COUNT(*) = (
    SELECT MAX(n) FROM (SELECT COUNT(*) AS n FROM Customer GROUP BY SupportRepId) AS counts
  )
);`,
    alt: `SELECT e.FirstName, e.LastName
FROM Employee e
JOIN Customer c ON c.SupportRepId = e.EmployeeId
GROUP BY e.EmployeeId, e.FirstName, e.LastName
HAVING COUNT(*) >= ALL (SELECT COUNT(*) FROM Customer GROUP BY SupportRepId);`,
    hints: ['Count customers per SupportRepId.', 'The quick way: ORDER BY that count DESC LIMIT 1. The tie-proof way: compare to the MAX of the counts (or use `>= ALL`).'],
    explain: 'Jane Peacock has 21 customers (Margaret Park 20, Steve Johnson 18). `ORDER BY COUNT(*) DESC LIMIT 1` gives the same answer here because there is a clear winner, but it would silently drop a tie. The MAX and `>= ALL` versions keep every rep that shares the top count.',
  },
  {
    id: 's10', topic: 'subq', level: 2, title: 'Albums nobody bought',
    prompt: 'How many albums have **no track that was ever sold**? One number.',
    solution: `SELECT COUNT(*)
FROM Album al
WHERE NOT EXISTS (
  SELECT 1
  FROM Track t
  JOIN InvoiceLine il ON il.TrackId = t.TrackId
  WHERE t.AlbumId = al.AlbumId
);`,
    hints: ['For each album, ask: does any of its tracks appear in InvoiceLine?', '`NOT EXISTS (SELECT 1 FROM Track ... JOIN InvoiceLine ... WHERE t.AlbumId = al.AlbumId)`'],
    explain: 'NOT EXISTS with a correlated subquery reads almost like English: "albums for which there does not exist a sold track".',
  },
  {
    id: 's11', topic: 'subq', level: 3, title: 'Second place',
    prompt: 'What is the **second highest** invoice total? (The highest value that is lower than the maximum.) One number.',
    solution: `SELECT MAX(Total)
FROM Invoice
WHERE Total < (SELECT MAX(Total) FROM Invoice);`,
    alt: `SELECT DISTINCT Total
FROM Invoice
ORDER BY Total DESC
LIMIT 1, 1;`,
    hints: ['The second highest is the max of everything below the max.', 'Or: distinct totals, sorted descending, skip one.'],
    explain: 'Two classic answers. Without DISTINCT, the LIMIT version breaks if the top value appears twice.',
  },
  {
    id: 's12', topic: 'subq', level: 3, title: 'Customers above the average spender',
    prompt: 'Show the **first name**, **last name** and **total spent** of customers whose total spending is **above the average total spending per customer**. Highest first; customers who spent the same in A to Z order of last name.',
    solution: `SELECT c.FirstName, c.LastName, SUM(i.Total) AS Spent
FROM Customer c
JOIN Invoice i ON i.CustomerId = c.CustomerId
GROUP BY c.CustomerId, c.FirstName, c.LastName
HAVING SUM(i.Total) > (
  SELECT AVG(t.s) FROM (SELECT SUM(Total) AS s FROM Invoice GROUP BY CustomerId) AS t
)
ORDER BY Spent DESC, c.LastName;`,
    ordered: true,
    hints: ['Per-customer totals: group by customer.', 'The average of those totals needs a derived table.', 'Compare in HAVING.', 'Sort by the total (descending), then by last name: many customers spent exactly the same.'],
    explain: 'The average per customer is an average of sums (about 39.47), so it needs a derived table. Note that `AVG(Total)` over invoices is a different number (5.65, the average invoice, not the average customer). Ties are everywhere here: eight customers spent exactly 39.62, which is why the last-name tiebreak is part of the question.',
  },

  // ---------------- func ----------------
  {
    id: 'c01', topic: 'func', level: 1, title: 'Full names',
    prompt: 'For customers in **France**, show one column **FullName** with the first and last name separated by a space (like *Camille Bernard*).',
    solution: `SELECT CONCAT(FirstName, ' ', LastName) AS FullName
FROM Customer
WHERE Country = 'France';`,
    hints: ["MySQL glues text with `CONCAT(a, ' ', b)`.", 'In MySQL `||` means OR, not concatenation.'],
    explain: "`CONCAT(FirstName, ' ', LastName)`. Watch out: if any argument is NULL, MySQL's CONCAT returns NULL for the whole thing.",
  },
  {
    id: 'c02', topic: 'func', level: 2, title: 'Email providers',
    prompt: 'Show each **email domain** (the part after the @) and how many customers use it. Most popular first, ties A to Z by domain.',
    solution: `SELECT SUBSTRING_INDEX(Email, '@', -1) AS Domain, COUNT(*) AS Customers
FROM Customer
GROUP BY SUBSTRING_INDEX(Email, '@', -1)
ORDER BY Customers DESC, Domain;`,
    ordered: true,
    hints: ["`SUBSTRING_INDEX(Email, '@', -1)` returns everything after the last @.", 'Group by that expression.'],
    explain: "SUBSTRING_INDEX with a negative count takes from the right. An alternative is `SUBSTRING(Email, LOCATE('@', Email) + 1)`. Gmail wins with 8.",
  },
  {
    id: 'c03', topic: 'func', level: 2, title: 'Short, medium, long',
    prompt: 'Label every track **short** (under 3 minutes), **medium** (3 minutes up to, but not including, 5) or **long** (5 minutes or more), and show each **label** with its **number of tracks**.',
    solution: `SELECT CASE
         WHEN Milliseconds < 180000 THEN 'short'
         WHEN Milliseconds < 300000 THEN 'medium'
         ELSE 'long'
       END AS Length,
       COUNT(*) AS Tracks
FROM Track
GROUP BY Length;`,
    hints: ['`CASE WHEN ... THEN ... ELSE ... END` makes a computed label.', 'The WHENs are checked in order: the first true one wins.', 'Group by the label (MySQL lets you use the alias).'],
    explain: 'Because CASE stops at the first true WHEN, the second condition doesn\'t need `>= 180000`. Grouping by the CASE alias works in MySQL; repeating the whole CASE in GROUP BY works everywhere.',
  },
  {
    id: 'c04', topic: 'func', level: 2, title: 'Company or private',
    prompt: 'For customers in the **USA**, show the **first name**, **last name**, and their **company**, or the word **Private** when they have none.',
    solution: `SELECT FirstName, LastName, IFNULL(Company, 'Private') AS Company
FROM Customer
WHERE Country = 'USA';`,
    alt: `SELECT FirstName, LastName, COALESCE(Company, 'Private') AS Company
FROM Customer
WHERE Country = 'USA';`,
    hints: ['Replace NULL with a value: `IFNULL(x, fallback)` or `COALESCE(x, fallback)`.'],
    explain: '`IFNULL(Company, \'Private\')` returns Company when it has a value, otherwise \'Private\'. COALESCE does the same and accepts more than two arguments.',
  },
  {
    id: 'c05', topic: 'func', level: 2, title: 'Age when hired',
    prompt: 'Show each employee\'s **first name**, **last name**, and their **age in full years on the day they were hired**.',
    solution: `SELECT FirstName, LastName, TIMESTAMPDIFF(YEAR, BirthDate, HireDate) AS AgeAtHire
FROM Employee;`,
    hints: ['`TIMESTAMPDIFF(YEAR, start, end)` counts complete years.', 'Start is BirthDate, end is HireDate.'],
    explain: '`YEAR(HireDate) - YEAR(BirthDate)` is a common shortcut, but it\'s wrong for anyone whose birthday comes later in the year than their hire date. TIMESTAMPDIFF counts full years correctly.',
  },
  {
    id: 'c06', topic: 'func', level: 2, title: 'A monthly report for 2021',
    prompt: 'For **2021**, show each month as text in the format **YYYY-MM** (like `2021-03`) and that month\'s **revenue**. In month order.',
    solution: `SELECT DATE_FORMAT(InvoiceDate, '%Y-%m') AS Month, SUM(Total) AS Revenue
FROM Invoice
WHERE YEAR(InvoiceDate) = 2021
GROUP BY DATE_FORMAT(InvoiceDate, '%Y-%m')
ORDER BY Month;`,
    ordered: true,
    hints: ["`DATE_FORMAT(d, '%Y-%m')` gives year-month text.", 'Group by that same expression.'],
    explain: "`%Y` is the 4-digit year, `%m` the 2-digit month. Because the text starts with the year, sorting it alphabetically is also chronological. (`%M` would give the month's name, like *March*, which sorts alphabetically, not by date.)",
  },
  {
    id: 'c07', topic: 'func', level: 3, title: 'Which weekday sells best',
    prompt: 'Show each **day of the week** (its name, like *Monday*) and the **total revenue** on that weekday across all years, best day first.',
    solution: `SELECT DAYNAME(InvoiceDate) AS Weekday, SUM(Total) AS Revenue
FROM Invoice
GROUP BY DAYNAME(InvoiceDate)
ORDER BY Revenue DESC;`,
    ordered: true,
    hints: ['`DAYNAME(date)` returns the weekday name.', 'Group by it, sum, sort.'],
    explain: 'Thursday wins, narrowly. `DAYOFWEEK()` would give numbers (1 = Sunday) instead of names.',
  },
  {
    id: 'c08', topic: 'func', level: 2, title: 'Song or video',
    prompt: 'For the tracks on albums **1** (AC/DC) and **227** (*Battlestar Galactica, Season 3*), show the **name**, **price**, and a column **Kind** that says **video** when the price is above 1 and **song** otherwise.',
    solution: `SELECT Name, UnitPrice, IF(UnitPrice > 1, 'video', 'song') AS Kind
FROM Track
WHERE AlbumId IN (1, 227);`,
    alt: `SELECT Name, UnitPrice, CASE WHEN UnitPrice > 1 THEN 'video' ELSE 'song' END AS Kind
FROM Track
WHERE AlbumId IN (1, 227);`,
    hints: ['Two albums: `WHERE AlbumId IN (1, 227)` (or two conditions with OR).', "MySQL has `IF(condition, value_if_true, value_if_false)`.", 'A CASE expression works too.'],
    explain: 'IF() is MySQL shorthand for a two-way CASE. The AC/DC songs cost 0.99 and say song; the 19 Battlestar episodes cost 1.99 and say video.',
  },
  {
    id: 'c09', topic: 'func', level: 2, title: 'Initials and user names',
    prompt: 'For customers in **Canada**, show their **initials** followed by dots (Mark Philips becomes **M.P.**) and the **user name** of their email, meaning the part before the @ (mphilips12@shaw.ca becomes **mphilips12**).',
    solution: `SELECT CONCAT(LEFT(FirstName, 1), '.', LEFT(LastName, 1), '.') AS Initials,
       SUBSTRING_INDEX(Email, '@', 1) AS UserName
FROM Customer
WHERE Country = 'Canada';`,
    alt: `SELECT CONCAT(LEFT(FirstName, 1), '.', LEFT(LastName, 1), '.') AS Initials,
       LEFT(Email, LOCATE('@', Email) - 1) AS UserName
FROM Customer
WHERE Country = 'Canada';`,
    hints: ['`LEFT(text, 1)` takes the first character. Glue the pieces with CONCAT.', "`SUBSTRING_INDEX(Email, '@', 1)` returns everything before the first @.", "Or: `LOCATE('@', Email)` finds the position of the @, and `LEFT(Email, position - 1)` takes everything before it."],
    explain: 'String functions combine freely. `SUBSTRING(FirstName, 1, 1)` is the same as `LEFT(FirstName, 1)`. With SUBSTRING_INDEX, a positive count takes from the left (before the @) and a negative one from the right (the domain, as in the email providers exercise).',
  },
  {
    id: 'c10', topic: 'func', level: 3, title: 'Days between purchases',
    prompt: 'For customer **1**, show each invoice\'s **InvoiceId**, **InvoiceDate**, and the number of **days since the customer\'s first invoice**. In date order.',
    solution: `SELECT InvoiceId, InvoiceDate,
       DATEDIFF(InvoiceDate, (SELECT MIN(InvoiceDate) FROM Invoice WHERE CustomerId = 1)) AS DaysSinceFirst
FROM Invoice
WHERE CustomerId = 1
ORDER BY InvoiceDate;`,
    ordered: true,
    hints: ['`DATEDIFF(later, earlier)` gives the number of days.', 'The first invoice date is `MIN(InvoiceDate)` for that customer, as a subquery.'],
    explain: 'A scalar subquery can sit inside the SELECT list too. DATEDIFF counts days, first date minus second.',
  },

  // ---------------- set ----------------
  {
    id: 'u01', topic: 'set', level: 2, title: 'Everyone in Canada',
    prompt: 'Make one list of **everyone** in Canada, customers and employees: **first name**, **last name**, and a column **Kind** saying **Customer** or **Employee**.',
    solution: `SELECT FirstName, LastName, 'Customer' AS Kind
FROM Customer
WHERE Country = 'Canada'
UNION ALL
SELECT FirstName, LastName, 'Employee'
FROM Employee
WHERE Country = 'Canada';`,
    hints: ['Two SELECTs, stacked with UNION ALL.', "Add a constant column: `'Customer' AS Kind` in the first, `'Employee'` in the second.", 'Both SELECTs need the same number of columns.'],
    explain: 'UNION stacks rows from two queries with the same column count. Column names come from the first SELECT. UNION ALL keeps duplicates (there are none here anyway, the Kind column differs).',
  },
  {
    id: 'u02', topic: 'set', level: 2, title: 'Every city we are in',
    prompt: 'List every **city** where we have a **customer or an employee**, each city once.',
    solution: `SELECT City FROM Customer
UNION
SELECT City FROM Employee;`,
    hints: ['UNION (without ALL) removes duplicates.'],
    explain: 'Plain `UNION` removes every duplicate row, across the two sides and within each side. Edmonton (home to a customer and an employee) appears once, and so does Calgary, where five employees live. 55 cities in all; `UNION ALL` would give 67 rows.',
  },
  {
    id: 'u03', topic: 'set', level: 3, title: 'Extremes',
    prompt: 'Show the **shortest** and the **longest** track in one result: columns **Which** (text: *shortest* or *longest*), **Name** and **Milliseconds**.',
    solution: `SELECT 'shortest' AS Which, Name, Milliseconds
FROM Track
WHERE Milliseconds = (SELECT MIN(Milliseconds) FROM Track)
UNION ALL
SELECT 'longest', Name, Milliseconds
FROM Track
WHERE Milliseconds = (SELECT MAX(Milliseconds) FROM Track);`,
    hints: ['Two queries, one for each end, glued with UNION ALL.', 'Each half finds its track with a MIN / MAX subquery.'],
    explain: 'In MySQL you can\'t put ORDER BY + LIMIT inside each half of a UNION unless you wrap each half in parentheses, like `(SELECT ... ORDER BY Milliseconds LIMIT 1) UNION ALL (SELECT ...)`. MIN/MAX subqueries avoid the problem altogether, and unlike `LIMIT 1` they also keep ties.',
  },

  // ---------------- dml ----------------
  {
    id: 'd01', topic: 'dml', level: 1, title: 'A new genre',
    prompt: 'Add a genre with **GenreId 26** and name **K-Pop**.',
    solution: `INSERT INTO Genre (GenreId, Name)
VALUES (26, 'K-Pop');`,
    check: 'SELECT GenreId, Name FROM Genre',
    hints: ['`INSERT INTO table (columns) VALUES (values);`'],
    explain: 'Listing the columns explicitly is the good habit: it still works if someone adds a column to the table later.',
  },
  {
    id: 'd02', topic: 'dml', level: 2, title: 'Jazz price rise',
    prompt: 'Set the **UnitPrice** of every **jazz** track (genre 2) to **1.29**. Nothing else should change.',
    solution: `UPDATE Track
SET UnitPrice = 1.29
WHERE GenreId = 2;`,
    check: 'SELECT GenreId, UnitPrice, COUNT(*) FROM Track GROUP BY GenreId, UnitPrice',
    hints: ['`UPDATE table SET column = value WHERE condition;`', 'Without WHERE, every track would change.'],
    explain: 'The WHERE in an UPDATE decides which rows change. Forgetting it is the most expensive mistake in SQL. Tip: run the WHERE as a SELECT first.',
  },
  {
    id: 'd03', topic: 'dml', level: 2, title: 'Empty the On-The-Go playlist',
    prompt: 'Remove every track from the playlist **On-The-Go 1** (PlaylistId 18), but keep the playlist itself.',
    solution: `DELETE FROM PlaylistTrack
WHERE PlaylistId = 18;`,
    check: 'SELECT PlaylistId, COUNT(*) FROM PlaylistTrack GROUP BY PlaylistId',
    hints: ['The playlist\'s tracks are rows in `PlaylistTrack`, not in Playlist.', '`DELETE FROM table WHERE condition;`'],
    explain: 'Deleting from the bridge table removes the links, while the playlist and the tracks stay. Deleting from Playlist would remove the playlist itself (and fail, because PlaylistTrack still points to it).',
  },
  {
    id: 'd04', topic: 'dml', level: 2, title: 'A very important customer',
    prompt: 'Add customer number **60**: first name **Hodaya**, last name **Zamir**, email **hodaya@goat.com**, country **Israel**, support rep **3**. Leave the other columns empty.',
    solution: `INSERT INTO Customer (CustomerId, FirstName, LastName, Email, Country, SupportRepId)
VALUES (60, 'Hodaya', 'Zamir', 'hodaya@goat.com', 'Israel', 3);`,
    check: 'SELECT CustomerId, FirstName, LastName, Email, Country, SupportRepId, Company FROM Customer WHERE CustomerId >= 58',
    hints: ['List only the columns you fill. The others become NULL.', 'FirstName, LastName and Email are NOT NULL, so they must be given.'],
    explain: 'Columns you leave out of the list get their default (NULL here). Leaving out a NOT NULL column without a default would fail. Welcome to Chinook, by the way.',
  },
  {
    id: 'd05', topic: 'dml', level: 3, title: 'A view for the boss',
    prompt: 'Create a view called **CustomerSpending** with each customer\'s **CustomerId**, **FirstName**, **LastName** and **Spent** (sum of their invoice totals).',
    solution: `CREATE VIEW CustomerSpending AS
SELECT c.CustomerId, c.FirstName, c.LastName, SUM(i.Total) AS Spent
FROM Customer c
JOIN Invoice i ON i.CustomerId = c.CustomerId
GROUP BY c.CustomerId, c.FirstName, c.LastName;`,
    check: 'SELECT CustomerId, FirstName, LastName, Spent FROM CustomerSpending',
    hints: ['`CREATE VIEW name AS SELECT ...;`', 'The SELECT is a normal group-by-customer query.', 'The view\'s column names come from the SELECT, so give the sum its name: `AS Spent`.'],
    explain: 'A view is a saved query that behaves like a table: `SELECT * FROM CustomerSpending` reruns it every time. It stores no data of its own.',
  },
  {
    id: 'd06', topic: 'dml', level: 2, title: 'Mark the Canadians',
    prompt: 'Every customer in **Canada** who has no company should get the company **Canuck Music Club**. Customers with a company keep theirs.',
    solution: `UPDATE Customer
SET Company = 'Canuck Music Club'
WHERE Country = 'Canada' AND Company IS NULL;`,
    check: 'SELECT CustomerId, Company FROM Customer',
    hints: ['Two conditions in the WHERE: the country, and the missing company.', 'Missing = `IS NULL`.'],
    explain: 'UPDATE with a compound WHERE. `Company = NULL` would match nothing and silently update zero rows.',
  },

  // ---------------- window (bonus) ----------------
  {
    id: 'w01', topic: 'window', level: 3, title: 'Rank the genres',
    prompt: '*Bonus, if your course covered window functions.* Show each genre **name**, its **tracks sold** (invoice lines), and its **rank** by tracks sold: 1 = best, tied genres share a rank, and the rank after a tie skips ahead (1, 2, 2, 4). Only genres that sold something. Best first, ties A to Z.',
    solution: `SELECT g.Name, COUNT(*) AS Sold,
       RANK() OVER (ORDER BY COUNT(*) DESC) AS Rnk
FROM InvoiceLine il
JOIN Track t ON t.TrackId = il.TrackId
JOIN Genre g ON g.GenreId = t.GenreId
GROUP BY g.GenreId, g.Name
ORDER BY Rnk, g.Name;`,
    ordered: true,
    hints: ['Group by genre and count first.', '`RANK() OVER (ORDER BY COUNT(*) DESC)` ranks the groups.'],
    explain: 'Window functions run after GROUP BY, so they can rank aggregated rows. RANK leaves gaps after ties (1, 2, 2, 4); DENSE_RANK doesn\'t (1, 2, 2, 3).',
  },
  {
    id: 'w02', topic: 'window', level: 3, title: 'Longest track per genre',
    prompt: '*Bonus.* For each genre, show the **genre name**, the **name** of its longest track and its **Milliseconds**. Ties: show all.',
    solution: `SELECT Genre, Name, Milliseconds
FROM (
  SELECT g.Name AS Genre, t.Name, t.Milliseconds,
         RANK() OVER (PARTITION BY t.GenreId ORDER BY t.Milliseconds DESC) AS r
  FROM Track t
  JOIN Genre g ON g.GenreId = t.GenreId
) AS ranked
WHERE r = 1;`,
    alt: `SELECT g.Name AS Genre, t.Name, t.Milliseconds
FROM Track t
JOIN Genre g ON g.GenreId = t.GenreId
WHERE t.Milliseconds = (SELECT MAX(t2.Milliseconds) FROM Track t2 WHERE t2.GenreId = t.GenreId);`,
    hints: ['Rank tracks within each genre: `PARTITION BY GenreId ORDER BY Milliseconds DESC`.', 'You can\'t filter a window function in WHERE. Wrap it in a derived table and filter outside.', 'No window functions? A correlated MAX subquery does it too.'],
    explain: 'The top-1-per-group pattern. Both the window version and the correlated subquery are valid; on an exam that didn\'t teach window functions, use the subquery.',
  },
  {
    id: 'w03', topic: 'window', level: 3, title: 'Running total, March 2021',
    prompt: '*Bonus.* For invoices from **March 2021**, show **InvoiceId**, **InvoiceDate**, **Total** and a **running total** of their revenue in InvoiceId order (the running total starts at the first March invoice).',
    solution: `SELECT InvoiceId, InvoiceDate, Total,
       SUM(Total) OVER (ORDER BY InvoiceId) AS RunningTotal
FROM Invoice
WHERE InvoiceDate >= '2021-03-01' AND InvoiceDate < '2021-04-01'
ORDER BY InvoiceId;`,
    ordered: true,
    hints: ['`SUM(Total) OVER (ORDER BY InvoiceId)` adds up everything up to the current row.', 'Filter March 2021 in WHERE. The window only sees rows that survive the WHERE.'],
    explain: 'With ORDER BY inside OVER, SUM becomes cumulative. Without it, every row would show the month\'s grand total (37.62). Window functions run after WHERE, so the running total starts at March\'s first invoice. If you computed it over all invoices in a derived table and filtered March afterwards, it would carry January and February along.',
  },
];
