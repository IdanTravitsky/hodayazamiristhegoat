// Refresher lessons on the Chinook database (MySQL 8 dialect).
// Every example runs through tools/validate.mjs against the real data; every number in the
// text was checked with tools/sql.cjs. Format: see tools/CONTENT_GUIDE.md.

export const LESSONS = [
  // ---------------------------------------------------------------- 1
  {
    id: 'select',
    topic: 'basics',
    title: 'SELECT, FROM, and the shape of a query',
    minutes: 6,
    blurb: 'Columns, aliases, calculated columns, DISTINCT, ORDER BY and LIMIT, plus how to look around a database you have never seen.',
    sections: [
      {
        h: 'Look around first: SHOW TABLES and DESCRIBE',
        md: `You know Sakila by heart. Chinook you don't, yet. Spend thirty seconds looking before you write anything.

- \`SHOW TABLES;\` lists the 11 tables. (MySQL on Windows lists them in lowercase, like \`track\`; there, any capitalisation works.)
- \`DESCRIBE Track;\` shows every column with its type, whether it may be NULL, and its key: \`PRI\` is the primary key, \`MUL\` means an index that allows repeated values, which in Chinook marks the foreign key columns.

Chinook names are **singular and PascalCase**: \`Track\`, not \`tracks\`; \`TrackId\`, not \`track_id\`. The Sakila map in your head: film → Track, actor → Artist, category → Genre, customer → Customer, staff → Employee, payment/rental → Invoice and InvoiceLine.`,
        examples: [
          { sql: `SHOW TABLES;`, note: 'The 11 tables of Chinook.' },
          { sql: `DESCRIBE Track;`, note: 'Columns of Track. AlbumId, MediaTypeId and GenreId are foreign keys (MUL).' },
        ],
      },
      {
        h: 'Columns, aliases and calculated columns',
        md: `\`SELECT\` picks the columns, \`FROM\` picks the table. \`SELECT *\` is fine for peeking, but on the exam name exactly the columns you were asked for, in that order.

\`AS\` renames a column in the output. Columns can be calculated on the fly: \`Milliseconds / 60000\` turns a track length into minutes. In MySQL, dividing two integers gives a decimal (5.7287, not 5; MySQL shows four decimals by default, the Playground a few more), so wrap it in \`ROUND(..., 2)\` to get something readable.

An alias that contains spaces or brackets needs backticks around it, as in the second example. Easier to skip the spaces: \`AS LengthMin\`.`,
        examples: [
          { sql: `SELECT Name, Milliseconds / 60000 AS Minutes, ROUND(Milliseconds / 60000, 2) AS MinutesRounded
FROM Track
LIMIT 5;`, note: 'Integer divided by integer gives a decimal in MySQL; ROUND tidies it.' },
          { sql: `SELECT Name AS \`Track name\`, ROUND(Milliseconds / 60000, 2) AS \`Length (min)\`, UnitPrice
FROM Track
LIMIT 5;`, note: 'Backticks let an alias contain spaces and brackets.' },
        ],
      },
      {
        h: 'DISTINCT: one row per different value',
        md: `\`DISTINCT\` removes duplicate **rows** from the result. It applies to the whole row, not just the first column: \`SELECT DISTINCT Country, City\` gives one row per different (Country, City) pair.

Chinook has 59 customers in 24 countries, so \`SELECT DISTINCT Country FROM Customer\` returns 24 rows. Tracks come in only two prices: 0.99, and 1.99 for 213 tracks that are all videos (TV episodes from shows like Lost and The Office).`,
        examples: [
          { sql: `SELECT DISTINCT UnitPrice FROM Track;`, note: 'Only two prices in the whole store.' },
          { sql: `SELECT DISTINCT Country, City
FROM Customer
ORDER BY Country, City;`, note: 'DISTINCT applies to the pair, so Brazil appears once per city.' },
        ],
      },
      {
        h: 'ORDER BY and LIMIT',
        md: `\`ORDER BY\` sorts. \`ASC\` is the default, \`DESC\` reverses. With several keys, each later key only breaks ties in the earlier ones, and each key gets its own direction: \`ORDER BY Total DESC, BillingCountry ASC\`.

\`LIMIT n\` keeps the first n rows **after** sorting. Without ORDER BY, "the first 5" are whatever the database feels like, so "the 5 longest" always needs both.

\`LIMIT offset, count\` skips first: \`LIMIT 5, 5\` means skip 5, return the next 5 (rows 6 to 10). The offset comes first, which trips people up. \`LIMIT 5 OFFSET 5\` says the same thing more readably.

In ascending order, NULLs come first in MySQL.`,
        examples: [
          { sql: `SELECT Name, Milliseconds
FROM Track
ORDER BY Milliseconds DESC
LIMIT 5;`, note: 'The five longest tracks. The winners are TV episodes, not songs.' },
          { sql: `SELECT Name, Milliseconds
FROM Track
ORDER BY Milliseconds DESC
LIMIT 5, 5;`, note: 'Rows 6 to 10 of the same ranking: skip 5, take 5.' },
          { sql: `SELECT BillingCountry, BillingCity, Total
FROM Invoice
ORDER BY Total DESC, BillingCountry
LIMIT 5;`, note: 'The second key orders the two 21.86 invoices, and decides which of the two 18.86 invoices gets fifth place.' },
        ],
      },
    ],
    pitfalls: [
      `\`LIMIT 5, 10\` is offset 5, count 10: rows 6 to 15, not "rows 5 to 10".`,
      `"Top N" without \`ORDER BY\` is a random N. On the exam, LIMIT almost always comes with an ORDER BY.`,
      `\`DISTINCT\` works on the whole row. \`SELECT DISTINCT(Country), City\` is still DISTINCT over both columns; the parentheses are just decoration.`,
      `Sakila habits: Chinook tables are singular (\`Customer\`, \`Track\`, \`Invoice\`) and ids are \`CustomerId\`, not \`customer_id\`. On a Linux MySQL server table names can be case-sensitive, so copy the exact spelling.`,
      `Text values go in single quotes: \`'USA'\`. A double-quoted \`"Name"\` is a text value in MySQL, not the column; use backticks if an identifier needs quoting.`,
    ],
    practice: ['b01', 'b02', 'b04', 'b05', 'b06', 'b09'],
  },

  // ---------------------------------------------------------------- 2
  {
    id: 'where',
    topic: 'filter',
    title: 'WHERE: filtering rows',
    minutes: 7,
    blurb: 'Comparisons, AND/OR with parentheses, IN, BETWEEN, LIKE, and the NULL rules that catch everyone.',
    sections: [
      {
        h: 'Comparisons, AND and OR',
        md: `\`WHERE\` keeps the rows where the condition is true. The operators: \`=\`, \`<>\` (or \`!=\`), \`<\`, \`<=\`, \`>\`, \`>=\`. Text goes in single quotes, and text comparison ignores case: \`Country = 'usa'\` still finds USA.

**AND binds tighter than OR**, like multiplication before addition. So

\`\`\`sql
WHERE Country = 'USA' OR Country = 'Canada' AND SupportRepId = 3
\`\`\`

means "every US customer, plus the Canadians that rep 3 looks after": 18 rows. What you almost always mean needs parentheses:

\`\`\`sql
WHERE (Country = 'USA' OR Country = 'Canada') AND SupportRepId = 3
\`\`\`

which gives 8 rows. Whenever a WHERE mixes AND with OR, add the parentheses, even if you think you don't need them.`,
        examples: [
          { sql: `SELECT FirstName, LastName, Country, SupportRepId
FROM Customer
WHERE Country = 'USA' OR Country = 'Canada' AND SupportRepId = 3;`, note: 'No parentheses: all 13 US customers sneak in, whatever their rep.' },
          { sql: `SELECT FirstName, LastName, Country, SupportRepId
FROM Customer
WHERE (Country = 'USA' OR Country = 'Canada') AND SupportRepId = 3;`, note: 'With parentheses: only rep 3, in either country.' },
        ],
      },
      {
        h: 'IN, BETWEEN and NOT',
        md: `- \`Country IN ('Brazil', 'Portugal', 'Argentina')\` is a short way to write three ORs, with no precedence worries.
- \`Total BETWEEN 0.99 AND 1.98\` is **inclusive on both ends**: it means \`Total >= 0.99 AND Total <= 1.98\`. The smaller value goes first.
- \`NOT\` flips a condition: \`NOT IN (...)\`, \`NOT BETWEEN\`, \`NOT LIKE\`, or \`NOT (a OR b)\`.

Dates need a little care. \`InvoiceDate\` is a DATETIME (\`2025-12-22 00:00:00\`), so for "December 2025" the safe patterns are \`YEAR(InvoiceDate) = 2025 AND MONTH(InvoiceDate) = 12\`, or a half-open range: \`>=\` the first day and \`<\` the first day of the next month. \`BETWEEN '2025-12-01' AND '2025-12-31'\` stops at midnight at the start of the 31st, so anything later that day would be missed. (Every Chinook time is midnight, so here it happens to give the right answer, but the half-open range is the version that is always right.)`,
        examples: [
          { sql: `SELECT FirstName, LastName, Country
FROM Customer
WHERE Country IN ('Brazil', 'Portugal', 'Argentina');`, note: 'Same as three ORs.' },
          { sql: `SELECT COUNT(*)
FROM Invoice
WHERE Total BETWEEN 0.99 AND 1.98;`, note: '166: the 55 invoices of exactly 0.99 and the 111 of exactly 1.98 both count.' },
          { sql: `SELECT InvoiceId, InvoiceDate, Total
FROM Invoice
WHERE InvoiceDate >= '2025-12-01' AND InvoiceDate < '2026-01-01';`, note: 'Half-open date range: the safe way to ask for December 2025.' },
        ],
      },
      {
        h: 'LIKE patterns',
        md: `\`LIKE\` matches text against a pattern with two wildcards:

- \`%\` any number of characters, including none
- \`_\` exactly one character

\`'Love%'\` starts with Love, \`'%love%'\` contains love anywhere, \`'%@gmail.com'\` ends with @gmail.com, \`'_e%'\` has e as its second letter. MySQL's LIKE ignores case, so \`'love%'\` and \`'Love%'\` find the same 27 tracks.

Without a wildcard, LIKE is just \`=\`: \`Name LIKE 'Love'\` finds only the track called exactly Love.`,
        examples: [
          { sql: `SELECT Name FROM Track WHERE Name LIKE 'love%';`, note: '27 tracks start with "love", in any case.' },
          { sql: `SELECT FirstName, LastName, Email
FROM Customer
WHERE Email LIKE '%@gmail.com';`, note: 'Ends with @gmail.com: 8 customers.' },
          { sql: `SELECT Name FROM Artist WHERE Name LIKE '_e%';`, note: 'The underscore stands for exactly one character, so e is the second letter (42 artists).' },
        ],
      },
      {
        h: 'NULL: the value that is not a value',
        md: `NULL means "unknown" or "missing". 977 tracks have no Composer; of the 59 customers, 49 have no Company and 29 have no State.

Any comparison with NULL gives *unknown*, and WHERE only keeps rows where the condition is *true*. So:

- \`WHERE Composer = NULL\` returns **0 rows**, always. Not an error, just silently empty. Write \`IS NULL\` (or \`IS NOT NULL\`).
- \`WHERE Composer <> 'AC/DC'\` returns 2518 rows, not 3495. The 977 tracks with no composer are neither equal nor unequal to AC/DC, so they vanish.

If you want the NULL rows too, say so: \`WHERE Composer <> 'AC/DC' OR Composer IS NULL\`.`,
        examples: [
          { sql: `SELECT COUNT(*) FROM Track WHERE Composer = NULL;`, note: 'Always 0. No error, which is exactly what makes it dangerous.' },
          { sql: `SELECT COUNT(*) FROM Track WHERE Composer IS NULL;`, note: '977: the right way to ask.' },
          { sql: `SELECT COUNT(*) FROM Customer WHERE State <> 'CA';`, note: 'Only 27, not 56: the 29 customers with no State drop out.' },
        ],
      },
    ],
    pitfalls: [
      `\`= NULL\` and \`<> NULL\` never match anything. Use \`IS NULL\` / \`IS NOT NULL\`.`,
      `\`a OR b AND c\` means \`a OR (b AND c)\`. Put parentheses around the OR part.`,
      `\`<>\`, \`NOT IN\` and \`NOT LIKE\` silently drop rows where the column is NULL. \`State NOT IN ('CA', 'WA')\` skips every customer with no State.`,
      `\`BETWEEN 15 AND 10\` (bigger number first) returns nothing. Small value first, and both ends are included.`,
      `Text values need quotes: \`WHERE Country = USA\` makes MySQL look for a column called USA ("Unknown column").`,
      `"Contains love" is \`LIKE '%love%'\`. Without the % signs, LIKE behaves like =.`,
    ],
    practice: ['f01', 'f03', 'f04', 'f05', 'f07', 'f08'],
  },

  // ---------------------------------------------------------------- 3
  {
    id: 'aggregates',
    topic: 'agg',
    title: 'Aggregates: COUNT, SUM, AVG, MIN, MAX',
    minutes: 6,
    blurb: 'Squash many rows into one number, and know exactly which rows each function counts.',
    sections: [
      {
        h: 'Five functions, one row',
        md: `An aggregate turns a whole set of rows into one value. With no GROUP BY, the whole table (or whatever survived the WHERE) is one big group, so you get exactly one row back.

- \`COUNT\` how many, \`SUM\` total, \`AVG\` mean, \`MIN\` / \`MAX\` smallest and largest.
- MIN and MAX also work on text (alphabetical order) and dates (earliest and latest).
- \`ROUND(x, 2)\` keeps money readable: unrounded, MySQL shows \`AVG(Total)\` as 5.651942 (the Playground shows even more decimals).

The whole store in one line: 412 invoices worth 2328.60.`,
        examples: [
          { sql: `SELECT COUNT(*) AS Invoices, SUM(Total) AS Revenue, ROUND(AVG(Total), 2) AS AvgInvoice,
       MIN(Total) AS Smallest, MAX(Total) AS Biggest
FROM Invoice;`, note: 'The whole table, one row.' },
          { sql: `SELECT MIN(InvoiceDate) AS FirstSale, MAX(InvoiceDate) AS LastSale FROM Invoice;`, note: 'MIN and MAX on dates: sales run from 2021-01-01 to 2025-12-22.' },
        ],
      },
      {
        h: 'COUNT(*) vs COUNT(column) vs COUNT(DISTINCT column)',
        md: `Three different questions:

- \`COUNT(*)\` counts **rows**, NULLs or not.
- \`COUNT(State)\` counts rows where State is **not NULL**.
- \`COUNT(DISTINCT State)\` counts **different** non-NULL values.

On Customer that is 59 rows, 30 with a State, 25 different states. For "how many customers have a company?", \`COUNT(Company)\` is the whole answer.`,
        examples: [
          { sql: `SELECT COUNT(*), COUNT(State), COUNT(DISTINCT State) FROM Customer;`, note: '59 / 30 / 25: three different questions.' },
          { sql: `SELECT COUNT(*) AS Customers, COUNT(Company) AS WithCompany, COUNT(DISTINCT Country) AS Countries
FROM Customer;`, note: '59 customers, 10 with a company, 24 countries.' },
        ],
      },
      {
        h: 'Aggregating a filtered set',
        md: `WHERE runs first, then the aggregate only sees the rows that survived. "Revenue from US invoices" is a WHERE plus a SUM.

Revenue can be computed at two levels: \`SUM(Total)\` on Invoice, or \`SUM(UnitPrice * Quantity)\` on InvoiceLine. They agree. Quantity is always 1 in Chinook, so counting invoice lines also counts units sold, but \`SUM(Quantity)\` is the version that stays right in general.`,
        examples: [
          { sql: `SELECT COUNT(*) AS Invoices, SUM(Total) AS Revenue, ROUND(AVG(Total), 2) AS AvgInvoice
FROM Invoice
WHERE BillingCountry = 'USA';`, note: '91 US invoices, 523.06 in total.' },
          { sql: `SELECT COUNT(*) AS Invoices, SUM(Total) AS Revenue
FROM Invoice
WHERE YEAR(InvoiceDate) = 2025;`, note: '2025 only: 80 invoices, 450.58.' },
          { sql: `SELECT SUM(UnitPrice * Quantity) AS Revenue FROM InvoiceLine;`, note: 'The same 2328.60, computed from the lines.' },
        ],
      },
      {
        h: 'NULLs and aggregates',
        md: `Every aggregate except \`COUNT(*)\` **skips NULLs**. So \`AVG(x)\` is \`SUM(x) / COUNT(x)\`, not \`SUM(x) / COUNT(*)\`: a NULL doesn't count as zero, it doesn't count at all. If the question wants NULL treated as 0, say so with \`AVG(IFNULL(x, 0))\`.

Over zero rows, \`COUNT\` gives 0 but \`SUM\`, \`AVG\`, \`MIN\` and \`MAX\` give NULL. Use \`IFNULL(SUM(x), 0)\` if you need a 0.

One more rule before the next lesson: an aggregate and a plain column can't share a SELECT without GROUP BY. \`SELECT Name, MAX(Milliseconds) FROM Track\` does **not** give you the name of the longest track.`,
        examples: [
          { sql: `SELECT COUNT(*) AS Employees, COUNT(ReportsTo) AS HaveABoss FROM Employee;`, note: '8 vs 7: the general manager reports to nobody (NULL).' },
          { sql: `SELECT COUNT(*) AS Invoices, SUM(Total) AS Revenue, MAX(Total) AS Biggest
FROM Invoice
WHERE BillingCountry = 'Japan';`, note: 'No Japanese invoices: COUNT says 0, SUM and MAX say NULL.' },
        ],
      },
    ],
    pitfalls: [
      `\`COUNT(Company)\` is not the number of customers; it is the number of customers that have a company (10 of 59).`,
      `\`AVG\` ignores NULLs and divides by the non-NULL count.`,
      `Aggregates can't go in WHERE: \`WHERE Total > AVG(Total)\` is an error. Use a subquery, or HAVING for groups.`,
      `\`SUM\` over no rows is NULL, not 0. Wrap it in \`IFNULL(..., 0)\` when the answer should be 0.`,
      `For "the longest track", \`SELECT Name, MAX(Milliseconds)\` is wrong (MySQL 8 rejects it). Use \`WHERE Milliseconds = (SELECT MAX(Milliseconds) FROM Track)\`, which also returns ties, or \`ORDER BY Milliseconds DESC LIMIT 1\`, which silently keeps just one of them.`,
    ],
    practice: ['a01', 'a02', 'a04', 'a05', 'a06', 'a07'],
  },

  // ---------------------------------------------------------------- 4
  {
    id: 'group-by',
    topic: 'group',
    title: 'GROUP BY and HAVING',
    minutes: 8,
    blurb: 'One row per group, filters before and after grouping, and the execution order that explains every alias rule.',
    sections: [
      {
        h: 'One row per group',
        md: `\`GROUP BY\` splits the rows into groups that share a value, and each aggregate then runs once per group. "Per country", "for each genre", "by year" are all GROUP BY in disguise.

Rule of thumb: whatever comes after "per" goes in GROUP BY, and usually in SELECT too, so the reader can see which group each number belongs to.

You can group by several columns (one row per Country and City pair) or by an expression such as \`YEAR(InvoiceDate)\`.`,
        examples: [
          { sql: `SELECT BillingCountry, COUNT(*) AS Invoices, SUM(Total) AS Revenue
FROM Invoice
GROUP BY BillingCountry
ORDER BY Revenue DESC
LIMIT 5;`, note: 'Revenue per country: the USA leads with 523.06.' },
          { sql: `SELECT YEAR(InvoiceDate) AS Yr, COUNT(*) AS Invoices, ROUND(SUM(Total), 2) AS Revenue
FROM Invoice
GROUP BY YEAR(InvoiceDate)
ORDER BY Yr;`, note: 'Grouping by an expression: one row per year, 2021 to 2025.' },
          { sql: `SELECT Country, City, COUNT(*) AS Customers
FROM Customer
GROUP BY Country, City
ORDER BY Customers DESC, Country, City
LIMIT 6;`, note: 'Two grouping columns: one row per (country, city) pair.' },
        ],
      },
      {
        h: 'WHERE vs HAVING',
        md: `Both filter, at different moments:

- \`WHERE\` filters **rows**, before grouping. It can't see aggregates.
- \`HAVING\` filters **groups**, after grouping. That's where \`COUNT(*) >= 5\` or \`SUM(Total) > 100\` go.

Often you need both. "Among the 0.99 tracks, which genres have more than 100?": the price test is about single tracks (WHERE), the count test is about whole genres (HAVING).

If a condition doesn't involve an aggregate, it belongs in WHERE.`,
        examples: [
          { sql: `SELECT Country, COUNT(*) AS Customers
FROM Customer
GROUP BY Country
HAVING COUNT(*) >= 5
ORDER BY Customers DESC, Country;`, note: 'Countries with at least 5 customers: USA, Canada, then Brazil and France with 5 each.' },
          { sql: `SELECT GenreId, COUNT(*) AS Tracks
FROM Track
WHERE UnitPrice = 0.99
GROUP BY GenreId
HAVING COUNT(*) > 100
ORDER BY Tracks DESC;`, note: 'WHERE picks the rows, HAVING picks the groups.' },
          { sql: `SELECT BillingCountry, SUM(Total) AS Revenue
FROM Invoice
WHERE SUM(Total) > 100
GROUP BY BillingCountry;`, note: 'Deliberate error: WHERE runs before groups exist, so it cannot use SUM.', expectError: true },
        ],
      },
      {
        h: 'The order SQL actually runs in',
        md: `You write SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT. The database runs them in this order:

1. \`FROM\` and the JOINs: which rows exist
2. \`WHERE\`: drop rows
3. \`GROUP BY\`: form groups
4. \`HAVING\`: drop groups
5. \`SELECT\`: compute the output columns and their aliases
6. \`ORDER BY\`: sort
7. \`LIMIT\`: cut

This explains the alias rules. An alias is born in step 5, so:

- \`ORDER BY Revenue\` works, because step 6 comes later.
- \`WHERE Minutes > 60\` fails in MySQL with "Unknown column 'Minutes' in 'where clause'". Repeat the expression instead: \`WHERE Milliseconds / 60000 > 60\`.
- MySQL is lenient in GROUP BY and HAVING and accepts aliases there, but repeating the aggregate (\`HAVING SUM(Total) > 100\`) works in every database. That's the safe exam habit.

> The practice engine flags this the way MySQL does: an alias in WHERE gets a "MySQL says no" note and counts as wrong in exercises.`,
        examples: [
          { sql: `SELECT Name, ROUND(Milliseconds / 60000, 1) AS Minutes
FROM Track
WHERE Milliseconds / 60000 > 60
ORDER BY Minutes DESC;`, note: 'WHERE repeats the expression; ORDER BY may use the alias.' },
          { sql: `SELECT BillingCountry, ROUND(SUM(Total), 2) AS Revenue
FROM Invoice
GROUP BY BillingCountry
HAVING SUM(Total) > 100
ORDER BY Revenue DESC;`, note: 'HAVING repeats SUM(Total); ORDER BY uses the alias.' },
        ],
      },
      {
        h: 'ONLY_FULL_GROUP_BY: the MySQL 8 rule',
        md: `In MySQL 8, every column in SELECT must either sit inside an aggregate or appear in GROUP BY. Otherwise MySQL refuses the query instead of guessing.

The classic mistake is wanting "the longest track and its name":

\`\`\`sql
SELECT Name, MAX(Milliseconds) FROM Track;
\`\`\`

MAX finds the biggest number, but nothing ties \`Name\` to that row. Two correct ways:

\`\`\`sql
SELECT Name, Milliseconds FROM Track ORDER BY Milliseconds DESC LIMIT 1;
SELECT Name, Milliseconds FROM Track WHERE Milliseconds = (SELECT MAX(Milliseconds) FROM Track);
\`\`\`

The first returns exactly one row even if several tracks tie for the longest; the second returns all of them. When the question says "the longest" and ties are possible, prefer the second.

The same rule bites with GROUP BY: \`SELECT GenreId, Name, COUNT(*) FROM Track GROUP BY GenreId\` is rejected, because one genre has many track names. When you group by an id and also want the name, group by both: \`GROUP BY g.GenreId, g.Name\`.

MySQL makes one exception: if you group by a table's primary key, it knows the other columns of that table can't vary inside the group, so \`GROUP BY g.GenreId\` alone would also let you show \`g.Name\`. Listing both is never wrong, so that's the habit to keep.`,
        examples: [
          { sql: `SELECT Name, MAX(Milliseconds) FROM Track;`, note: 'The Playground runs it with a warning; MySQL 8 refuses it outright.', expectWarning: true },
          { sql: `SELECT Name, Milliseconds
FROM Track
WHERE Milliseconds = (SELECT MAX(Milliseconds) FROM Track);`, note: 'The correct version: the longest track and its real name.' },
        ],
      },
    ],
    pitfalls: [
      `Every non-aggregated column in SELECT must be in GROUP BY (MySQL 8, ONLY_FULL_GROUP_BY).`,
      `Conditions on aggregates go in HAVING; conditions on single rows go in WHERE.`,
      `A SELECT alias can't be used in WHERE. ORDER BY may use it.`,
      `After GROUP BY, \`COUNT(*)\` counts the rows inside each group, not the number of groups. "How many countries have invoices?" is \`COUNT(DISTINCT BillingCountry)\`.`,
      `Group by the id, not just the name: Chinook has two playlists called "Music" (and two each of "TV Shows", "Movies" and "Audiobooks"). Grouping by Name would merge them.`,
    ],
    practice: ['g01', 'g02', 'g04', 'g05', 'g08', 'g10'],
  },

  // ---------------------------------------------------------------- 5
  {
    id: 'joins',
    topic: 'join',
    title: 'INNER JOIN: combining tables',
    minutes: 8,
    blurb: 'Follow the foreign keys from InvoiceLine all the way to Artist, keep column names unambiguous, and watch rows multiply.',
    sections: [
      {
        h: 'The Chinook map',
        md: `Joins follow foreign keys. The two paths you will walk most:

- **Music:** \`Track.AlbumId\` → \`Album\`, then \`Album.ArtistId\` → \`Artist\`. Track also points to \`Genre\` (GenreId) and \`MediaType\` (MediaTypeId).
- **Sales:** \`Invoice.CustomerId\` → \`Customer\`, \`InvoiceLine.InvoiceId\` → \`Invoice\`, and \`InvoiceLine.TrackId\` → \`Track\`.

Plus \`Customer.SupportRepId\` → \`Employee\`, \`Employee.ReportsTo\` → \`Employee\`, and \`PlaylistTrack\` between \`Playlist\` and \`Track\`.

Unlike Sakila's film_actor, there is no bridge table between tracks and artists: a track belongs to an album, and the album belongs to an artist. So "the artist of a track" is always two joins away.`,
        examples: [
          { sql: `SELECT t.Name AS Track, al.Title AS Album, ar.Name AS Artist
FROM Track t
JOIN Album al ON al.AlbumId = t.AlbumId
JOIN Artist ar ON ar.ArtistId = al.ArtistId
ORDER BY t.TrackId
LIMIT 5;`, note: 'Track → Album → Artist: two joins to name the artist of each track.' },
        ],
      },
      {
        h: 'INNER JOIN ... ON, with aliases',
        md: `\`JOIN\` (the same as \`INNER JOIN\`) pairs each row of one table with the rows of another where the ON condition is true. Rows that find no partner disappear from the result.

Give every table a short alias (\`t\`, \`al\`, \`ar\`, \`g\`, \`c\`, \`i\`, \`il\`) and put it in front of every column. Less typing, zero ambiguity.

Joins are also how ids turn into names. Track only stores \`GenreId = 1\`; the Genre table says that 1 is Rock.`,
        examples: [
          { sql: `SELECT t.Name AS Track, g.Name AS Genre, mt.Name AS MediaType
FROM Track t
JOIN Genre g ON g.GenreId = t.GenreId
JOIN MediaType mt ON mt.MediaTypeId = t.MediaTypeId
ORDER BY t.TrackId
LIMIT 5;`, note: 'Ids turned into names.' },
          { sql: `SELECT g.Name AS Genre, COUNT(*) AS Tracks
FROM Track t
JOIN Genre g ON g.GenreId = t.GenreId
GROUP BY g.GenreId, g.Name
ORDER BY Tracks DESC
LIMIT 5;`, note: 'Join, then group: tracks per genre with real names. Rock wins with 1297.' },
        ],
      },
      {
        h: 'The Name trap',
        md: `A column called \`Name\` exists in **five** tables: Artist, Genre, MediaType, Playlist and Track. As soon as two of them meet in one query, a bare \`Name\` is ambiguous and MySQL stops with "Column 'Name' in field list is ambiguous".

The fix is the prefix (\`t.Name\`, \`g.Name\`), plus an output alias (\`t.Name AS Track, g.Name AS Genre\`), otherwise the result has two columns both called Name.

The id you join on has the same problem: \`GenreId\` is in both Track and Genre.`,
        examples: [
          { sql: `SELECT Name
FROM Track
JOIN Genre ON Genre.GenreId = Track.GenreId
LIMIT 5;`, note: 'Deliberate error: which Name, the track or the genre?', expectError: true },
          { sql: `SELECT t.Name AS Track, g.Name AS Genre
FROM Track t
JOIN Genre g ON g.GenreId = t.GenreId
ORDER BY t.TrackId
LIMIT 5;`, note: 'Prefixed and aliased: no doubt left.' },
        ],
      },
      {
        h: 'Long chains, and rows that multiply',
        md: `"Which artists sell the most?" needs four tables: InvoiceLine (the sales) → Track → Album → Artist. Write one JOIN per line, each ON connecting the new table to one that is already there.

Every join can **multiply rows**. Some invoices have 14 lines, and after joining InvoiceLine each of those invoices appears 14 times. That's what you want when counting lines, but it inflates any invoice-level column you sum:

- \`SUM(Total)\` on Invoice alone: 2328.60
- the same SUM after joining InvoiceLine: 20848.62, because each Total is added once per line

Sum a column at the level where it lives: invoice totals from Invoice, line revenue as \`SUM(il.UnitPrice * il.Quantity)\` from InvoiceLine.`,
        examples: [
          { sql: `SELECT ar.Name AS Artist, SUM(il.Quantity) AS UnitsSold
FROM InvoiceLine il
JOIN Track t ON t.TrackId = il.TrackId
JOIN Album al ON al.AlbumId = t.AlbumId
JOIN Artist ar ON ar.ArtistId = al.ArtistId
GROUP BY ar.ArtistId, ar.Name
ORDER BY UnitsSold DESC
LIMIT 5;`, note: 'Four tables in a chain. Iron Maiden sold the most units (140).' },
          { sql: `SELECT SUM(i.Total) AS Inflated
FROM Invoice i
JOIN InvoiceLine il ON il.InvoiceId = i.InvoiceId;`, note: 'Wrong on purpose: 20848.62 instead of 2328.60, each Total counted once per line.' },
        ],
      },
    ],
    pitfalls: [
      `A bare \`Name\` (or any column that two joined tables share) is an "ambiguous" error. Prefix it.`,
      `Joining on the wrong columns (\`ON al.AlbumId = t.TrackId\`) runs without any error and returns nonsense. Match each foreign key to the key it points at.`,
      `In MySQL a JOIN without ON quietly becomes a cross join: every track paired with every genre, 3503 × 25 = 87575 rows.`,
      `INNER JOIN drops rows with no partner: \`Artist JOIN Album\` silently loses the 71 artists who have no album. "All artists" needs a LEFT JOIN.`,
      `Summing an invoice-level column (\`i.Total\`) after joining InvoiceLine inflates it.`,
      `Group by id and name, not name alone: two different tracks can share a name ("Enter Sandman" appears twice).`,
    ],
    practice: ['j01', 'j02', 'j03', 'j04', 'j05', 'j07'],
  },

  // ---------------------------------------------------------------- 6
  {
    id: 'outer-joins',
    topic: 'join',
    title: 'LEFT JOIN, self joins and many-to-many',
    minutes: 9,
    blurb: 'Keep the rows that have no partner, find the things that never happened, and join a table to itself.',
    sections: [
      {
        h: 'LEFT JOIN keeps the left side',
        md: `\`A LEFT JOIN B\` returns every row of A. Where B has a match you get B's columns; where it doesn't, B's columns come back as NULL.

Chinook has 275 artists, but only 204 of them have an album. \`Artist JOIN Album\` gives 347 rows (one per album) and loses 71 artists. \`Artist LEFT JOIN Album\` gives 418 rows: the 347 album rows plus one all-NULL row for each of those 71.

When you count after a LEFT JOIN, count a column of the right table: \`COUNT(al.AlbumId)\` gives 0 for an artist with no albums, while \`COUNT(*)\` gives 1, because the NULL row is still a row.`,
        examples: [
          { sql: `SELECT ar.Name AS Artist, COUNT(al.AlbumId) AS Albums
FROM Artist ar
LEFT JOIN Album al ON al.ArtistId = ar.ArtistId
GROUP BY ar.ArtistId, ar.Name
ORDER BY Albums, ar.Name
LIMIT 5;`, note: 'Artists with no albums show up with 0. With INNER JOIN they would be missing.' },
          { sql: `SELECT ar.Name AS Artist, COUNT(*) AS Albums
FROM Artist ar
LEFT JOIN Album al ON al.ArtistId = ar.ArtistId
GROUP BY ar.ArtistId, ar.Name
ORDER BY Albums, ar.Name
LIMIT 5;`, note: 'Same query with COUNT(*): A Cor Do Som has no albums but shows 1.' },
        ],
      },
      {
        h: 'Finding the things that never happened',
        md: `"Tracks never sold", "artists without albums", "customers with no invoice in 2025" are all the same pattern: LEFT JOIN, then keep only the rows where the right side found nothing.

\`\`\`sql
FROM Track t
LEFT JOIN InvoiceLine il ON il.TrackId = t.TrackId
WHERE il.InvoiceLineId IS NULL
\`\`\`

Test a column that can never be NULL in a real match; the right table's primary key is the safest choice. 1519 of the 3503 tracks have never been sold.

NOT EXISTS gives the same answer; it's in the subqueries lesson.`,
        examples: [
          { sql: `SELECT COUNT(*) AS NeverSold
FROM Track t
LEFT JOIN InvoiceLine il ON il.TrackId = t.TrackId
WHERE il.InvoiceLineId IS NULL;`, note: '1519 tracks have never been sold.' },
          { sql: `SELECT ar.ArtistId, ar.Name
FROM Artist ar
LEFT JOIN Album al ON al.ArtistId = ar.ArtistId
WHERE al.AlbumId IS NULL
ORDER BY ar.Name
LIMIT 10;`, note: 'Artists with no album (71 in total; the first 10 shown).' },
        ],
      },
      {
        h: 'ON or WHERE? With LEFT JOIN it matters',
        md: `With an INNER JOIN, a condition gives the same result in ON or in WHERE. With a LEFT JOIN it does not:

- In **ON**, the condition decides which right-side rows count as a *match*. Every left row is kept regardless.
- In **WHERE**, the condition runs *after* the join and throws rows away, including the NULL rows the LEFT JOIN worked hard to keep.

"Every customer with their number of 2025 invoices" needs the year test in ON: 59 rows, 13 of them with 0. Move it to WHERE and those 13 vanish (46 rows). You have quietly turned the LEFT JOIN back into an INNER JOIN.`,
        examples: [
          { sql: `SELECT c.CustomerId, c.FirstName, c.LastName, COUNT(i.InvoiceId) AS Invoices2025
FROM Customer c
LEFT JOIN Invoice i ON i.CustomerId = c.CustomerId AND YEAR(i.InvoiceDate) = 2025
GROUP BY c.CustomerId, c.FirstName, c.LastName
ORDER BY Invoices2025, c.CustomerId;`, note: 'Year test in ON: all 59 customers, 13 with zero.' },
          { sql: `SELECT c.CustomerId, c.FirstName, c.LastName, COUNT(i.InvoiceId) AS Invoices2025
FROM Customer c
LEFT JOIN Invoice i ON i.CustomerId = c.CustomerId
WHERE YEAR(i.InvoiceDate) = 2025
GROUP BY c.CustomerId, c.FirstName, c.LastName
ORDER BY Invoices2025, c.CustomerId;`, note: 'Year test in WHERE: only 46 rows. The zeros are gone.' },
        ],
      },
      {
        h: 'Self join: an employee and their manager',
        md: `\`Employee.ReportsTo\` holds the EmployeeId of the manager, who lives in the same table. To show both names, use the table twice under two aliases: \`e\` for the employee, \`m\` for the manager.

\`\`\`sql
FROM Employee e
JOIN Employee m ON e.ReportsTo = m.EmployeeId
\`\`\`

Read it as "e's ReportsTo is m's id". A plain JOIN gives 7 rows: Andrew Adams, the general manager, reports to nobody (NULL) and drops out. LEFT JOIN keeps him, with a NULL manager.

The other Employee link is \`Customer.SupportRepId\` → \`Employee.EmployeeId\`. Only the three sales support agents have customers: Jane Peacock 21, Margaret Park 20, Steve Johnson 18.`,
        examples: [
          { sql: `SELECT CONCAT(e.FirstName, ' ', e.LastName) AS Employee, e.Title,
       CONCAT(m.FirstName, ' ', m.LastName) AS Manager
FROM Employee e
LEFT JOIN Employee m ON e.ReportsTo = m.EmployeeId;`, note: 'The same table twice. LEFT JOIN keeps Andrew Adams, who has no manager.' },
          { sql: `SELECT CONCAT(e.FirstName, ' ', e.LastName) AS Rep, COUNT(c.CustomerId) AS Customers
FROM Employee e
LEFT JOIN Customer c ON c.SupportRepId = e.EmployeeId
GROUP BY e.EmployeeId, e.FirstName, e.LastName
ORDER BY Customers DESC, e.EmployeeId;`, note: 'Customers per support rep. Only the three sales support agents have any.' },
        ],
      },
      {
        h: 'Many-to-many: PlaylistTrack',
        md: `A playlist has many tracks and a track can sit on many playlists. One foreign key can't express that, so \`PlaylistTrack(PlaylistId, TrackId)\` sits in the middle with one row per (playlist, track) pair, exactly like Sakila's film_actor and film_category.

Getting from playlists to tracks always goes through it: Playlist → PlaylistTrack → Track, then on to Album and Artist if needed.

Playlist names repeat: there are two playlists called "Music" (and two each of "TV Shows", "Movies" and "Audiobooks"), so group by PlaylistId.`,
        examples: [
          { sql: `SELECT t.Name AS Track, ar.Name AS Artist
FROM Playlist p
JOIN PlaylistTrack pt ON pt.PlaylistId = p.PlaylistId
JOIN Track t ON t.TrackId = pt.TrackId
JOIN Album al ON al.AlbumId = t.AlbumId
JOIN Artist ar ON ar.ArtistId = al.ArtistId
WHERE p.Name = 'Grunge';`, note: 'The 15 tracks of the Grunge playlist, through the bridge table.' },
          { sql: `SELECT p.PlaylistId, p.Name, COUNT(pt.TrackId) AS Tracks
FROM Playlist p
LEFT JOIN PlaylistTrack pt ON pt.PlaylistId = p.PlaylistId
GROUP BY p.PlaylistId, p.Name
ORDER BY Tracks DESC, p.PlaylistId;`, note: 'All 18 playlists, including the 4 empty ones.' },
        ],
      },
    ],
    pitfalls: [
      `A WHERE condition on the right-hand table of a LEFT JOIN turns it back into an INNER JOIN. Put that condition in ON.`,
      `After a LEFT JOIN, count a right-side column (\`COUNT(al.AlbumId)\`), not \`COUNT(*)\`, or the missing ones count as 1.`,
      `"Never", "without", "no ..." questions: LEFT JOIN plus \`IS NULL\` on the right table's key, or NOT EXISTS.`,
      `In a self join, read the ON aloud. \`e.ReportsTo = m.EmployeeId\` gives each employee their manager; swapping the sides gives each manager their reports.`,
      `The table you want all of goes on the left: \`Artist LEFT JOIN Album\` keeps every artist, \`Album LEFT JOIN Artist\` keeps every album. MySQL has RIGHT JOIN too, but no FULL OUTER JOIN.`,
    ],
    practice: ['j09', 'j10', 'j11', 'j12', 'j14', 'j17'],
  },

  // ---------------------------------------------------------------- 7
  {
    id: 'subqueries',
    topic: 'subq',
    title: 'Subqueries',
    minutes: 10,
    blurb: 'Queries inside queries: compare to an average, test membership, check existence, and aggregate an aggregate.',
    sections: [
      {
        h: 'Scalar subqueries: compare to a computed value',
        md: `A subquery in parentheses that returns **one value** can stand anywhere a number could. The classic is "above average":

\`\`\`sql
WHERE Total > (SELECT AVG(Total) FROM Invoice)
\`\`\`

You can't write \`WHERE Total > AVG(Total)\`, because aggregates aren't allowed in WHERE. The subquery computes the average first, as its own little query, and the outer WHERE compares each row to that number.

Same trick for "the longest track" or "the most recent invoice": \`= (SELECT MAX(...) FROM ...)\`. Unlike ORDER BY ... LIMIT 1, it returns every row tied for first.`,
        examples: [
          { sql: `SELECT InvoiceId, CustomerId, Total
FROM Invoice
WHERE Total > (SELECT AVG(Total) FROM Invoice)
ORDER BY Total DESC, InvoiceId
LIMIT 5;`, note: '179 invoices beat the 5.65 average; these are the top five. Two invoices tie at 18.86 for fifth place, so InvoiceId decides.' },
          { sql: `SELECT Name, Milliseconds
FROM Track
WHERE Milliseconds = (SELECT MAX(Milliseconds) FROM Track);`, note: 'The longest track, with ties included if there were any.' },
        ],
      },
      {
        h: 'IN and NOT IN (and the NULL trap)',
        md: `When the subquery returns a **list** (one column, many rows), use \`IN\`. "Customers with at least one invoice over 20":

\`\`\`sql
WHERE CustomerId IN (SELECT CustomerId FROM Invoice WHERE Total > 20)
\`\`\`

The subquery must select exactly one column: the one you compare against.

\`NOT IN\` hides a nasty trap: **if the list contains a NULL, NOT IN returns nothing at all.** "Employees who manage nobody" looks innocent:

\`\`\`sql
WHERE EmployeeId NOT IN (SELECT ReportsTo FROM Employee)
\`\`\`

It returns 0 rows, because Andrew Adams' ReportsTo is NULL. \`x NOT IN (1, 2, NULL)\` means \`x <> 1 AND x <> 2 AND x <> NULL\`, and that last part is never true. Fix it by filtering the NULLs out of the subquery, or use NOT EXISTS.`,
        examples: [
          { sql: `SELECT FirstName, LastName, Country
FROM Customer
WHERE CustomerId IN (SELECT CustomerId FROM Invoice WHERE Total > 20);`, note: 'Four customers have spent more than 20 on a single invoice.' },
          { sql: `SELECT FirstName, LastName, Title
FROM Employee
WHERE EmployeeId NOT IN (SELECT ReportsTo FROM Employee);`, note: 'The trap: 0 rows, because the list contains a NULL.' },
          { sql: `SELECT FirstName, LastName, Title
FROM Employee
WHERE EmployeeId NOT IN (SELECT ReportsTo FROM Employee WHERE ReportsTo IS NOT NULL);`, note: 'Fixed: the five employees nobody reports to.' },
        ],
      },
      {
        h: 'EXISTS and NOT EXISTS',
        md: `\`EXISTS (subquery)\` is true when the subquery returns at least one row. What it selects doesn't matter, so people write \`SELECT 1\`. It nearly always refers to the outer row, as in "artists for whom there exists an album with Live in the title".

\`NOT EXISTS\` is the safe version of NOT IN: NULLs can't break it. "Tracks never sold" with NOT EXISTS gives the same 1519 as the LEFT JOIN ... IS NULL pattern.`,
        examples: [
          { sql: `SELECT ar.Name
FROM Artist ar
WHERE EXISTS (SELECT 1 FROM Album al
              WHERE al.ArtistId = ar.ArtistId AND al.Title LIKE '%Live%')
ORDER BY ar.Name;`, note: '11 artists have an album with "Live" in its title.' },
          { sql: `SELECT COUNT(*) AS NeverSold
FROM Track t
WHERE NOT EXISTS (SELECT 1 FROM InvoiceLine il WHERE il.TrackId = t.TrackId);`, note: 'Same 1519 as LEFT JOIN ... IS NULL.' },
          { sql: `SELECT FirstName, LastName, Title
FROM Employee e
WHERE NOT EXISTS (SELECT 1 FROM Employee x WHERE x.ReportsTo = e.EmployeeId);`, note: 'Employees who manage nobody, with no NULL trap.' },
        ],
      },
      {
        h: 'Correlated subqueries: compare each row to its own group',
        md: `A correlated subquery mentions a column of the outer query, so it is re-evaluated for every outer row. That's how you compare a row to *its own* group instead of the whole table.

"Tracks longer than the average of their own album":

\`\`\`sql
SELECT t.Name, t.Milliseconds
FROM Track t
WHERE t.Milliseconds > (SELECT AVG(t2.Milliseconds)
                        FROM Track t2
                        WHERE t2.AlbumId = t.AlbumId)
\`\`\`

The inner Track needs its own alias (\`t2\`). Without it, \`WHERE AlbumId = AlbumId\` compares the inner row with itself, which is always true, and you are back to the overall average.`,
        examples: [
          { sql: `SELECT t.Name, t.AlbumId, t.Milliseconds
FROM Track t
WHERE t.Milliseconds > (SELECT AVG(t2.Milliseconds)
                        FROM Track t2
                        WHERE t2.AlbumId = t.AlbumId)
ORDER BY t.AlbumId, t.Milliseconds DESC
LIMIT 10;`, note: '1559 tracks beat their own album\'s average; here are the first ten.' },
        ],
      },
      {
        h: 'Derived tables, ALL and ANY',
        md: `Aggregates can't be nested: \`AVG(COUNT(*))\` is an error. Instead, build the inner result as a table in FROM, give it a name, and query it:

\`\`\`sql
SELECT AVG(n)
FROM (SELECT CustomerId, COUNT(*) AS n
      FROM Invoice
      GROUP BY CustomerId) AS per_customer;
\`\`\`

Inside: one row per customer with their invoice count. Outside: the average of those counts. In MySQL a derived table **must have an alias**, even if you never use it.

The last two tools: \`x > ALL (subquery)\` means bigger than every value in the list (bigger than its MAX), and \`x > ANY (subquery)\` means bigger than at least one (bigger than its MIN). \`= ANY\` is the same as \`IN\`.`,
        examples: [
          { sql: `SELECT ROUND(AVG(n), 2) AS AvgInvoicesPerCustomer
FROM (SELECT CustomerId, COUNT(*) AS n
      FROM Invoice
      GROUP BY CustomerId) AS per_customer;`, note: '6.98: every customer has 7 invoices except one, who has 6.' },
          { sql: `SELECT ROUND(AVG(Spent), 2) AS AvgSpent, MIN(Spent) AS Lowest, MAX(Spent) AS Highest
FROM (SELECT CustomerId, SUM(Total) AS Spent
      FROM Invoice
      GROUP BY CustomerId) AS per_customer;`, note: 'Lifetime spend per customer, then summarised: 39.47 on average.' },
          { sql: `SELECT Name, Milliseconds
FROM Track
WHERE Milliseconds > ALL (SELECT Milliseconds FROM Track WHERE GenreId = 3)
ORDER BY Milliseconds DESC
LIMIT 5;`, note: '> ALL: longer than every Metal track (225 tracks qualify).' },
        ],
      },
    ],
    pitfalls: [
      `\`NOT IN\` with a NULL anywhere in the list returns no rows. Add \`WHERE col IS NOT NULL\` inside the subquery, or use NOT EXISTS.`,
      `After \`=\`, \`<\` or \`>\` the subquery must return a single value. If it returns several rows, MySQL stops with "Subquery returns more than 1 row". When that can happen, use IN, ANY or ALL.`,
      `\`> ALL\` is "bigger than the MAX" only when the subquery returns values and none of them is NULL. Over an empty subquery it is true for every row (there is nothing to beat), and a NULL in the list makes it never true: the same trap as NOT IN, which is really \`<> ALL\`.`,
      `A subquery used with IN must select exactly one column.`,
      `A derived table in FROM needs an alias in MySQL: \`) AS per_customer\`. Without it, error 1248.`,
      `In a correlated subquery, give the inner table its own alias (\`t2\`) and qualify both sides of the link.`,
    ],
    practice: ['s01', 's02', 's03', 's05', 's06', 's08'],
  },

  // ---------------------------------------------------------------- 8
  {
    id: 'functions',
    topic: 'func',
    title: 'CASE, strings, dates and numbers',
    minutes: 10,
    blurb: 'The function toolbox: bucketing with CASE, handling NULLs, slicing text, and pulling years and months out of dates.',
    sections: [
      {
        h: 'CASE WHEN: your own categories',
        md: `\`CASE\` checks its conditions top to bottom and returns the value of the **first** one that is true. \`ELSE\` catches everything else; without ELSE you get NULL. Don't forget the \`END\`.

\`\`\`sql
CASE
  WHEN Milliseconds < 180000 THEN 'short'
  WHEN Milliseconds < 300000 THEN 'medium'
  ELSE 'long'
END
\`\`\`

Because the first match wins, the second WHEN doesn't need \`>= 180000\`: short tracks were already caught. Order the WHENs from one end of the scale to the other.

CASE is an expression, so it can go in SELECT, GROUP BY, ORDER BY, or inside an aggregate. For two outcomes MySQL also has \`IF(condition, a, b)\`.`,
        examples: [
          { sql: `SELECT Name, Milliseconds,
       CASE WHEN Milliseconds < 180000 THEN 'short'
            WHEN Milliseconds < 300000 THEN 'medium'
            ELSE 'long' END AS LengthBucket
FROM Track
LIMIT 5;`, note: 'A label for every row.' },
          { sql: `SELECT CASE WHEN Milliseconds < 180000 THEN 'short'
            WHEN Milliseconds < 300000 THEN 'medium'
            ELSE 'long' END AS LengthBucket,
       COUNT(*) AS Tracks
FROM Track
GROUP BY LengthBucket
ORDER BY Tracks DESC;`, note: '1954 medium, 1069 long, 480 short.' },
          { sql: `SELECT IF(UnitPrice > 1, 'premium', 'standard') AS PriceTier, COUNT(*) AS Tracks
FROM Track
GROUP BY PriceTier;`, note: 'IF for two outcomes: 213 premium tracks at 1.99.' },
        ],
      },
      {
        h: 'NULL helpers: IFNULL and COALESCE',
        md: `- \`IFNULL(x, fallback)\` returns x, or the fallback when x is NULL.
- \`COALESCE(a, b, c, ...)\` returns the first non-NULL value in its list. With two arguments it does what IFNULL does, and it's standard SQL.

Handy for display ("Private customer" instead of NULL) and for math (\`IFNULL(SUM(x), 0)\`).

\`CONCAT\` has a NULL trap: if **any** argument is NULL, the whole result is NULL. Leonie Köhler has no State, so \`CONCAT(City, ', ', State)\` is NULL for her. Patch the nullable part: \`CONCAT(City, ', ', COALESCE(State, Country))\`.`,
        examples: [
          { sql: `SELECT FirstName, LastName, IFNULL(Company, 'Private customer') AS Company
FROM Customer
LIMIT 5;`, note: 'NULL replaced by a readable label.' },
          { sql: `SELECT FirstName, LastName,
       CONCAT(City, ', ', State) AS Broken,
       CONCAT(City, ', ', COALESCE(State, Country)) AS Fixed
FROM Customer
ORDER BY CustomerId
LIMIT 5;`, note: 'One NULL argument makes all of CONCAT NULL (Leonie Köhler, row 2). COALESCE fills the hole.' },
        ],
      },
      {
        h: 'Text functions',
        md: `The ones worth knowing by heart:

- \`CONCAT(a, b, ...)\` glues text together. In MySQL \`||\` means OR, not "glue".
- \`UPPER(s)\`, \`LOWER(s)\`
- \`CHAR_LENGTH(s)\` counts characters. \`LENGTH(s)\` counts **bytes** in MySQL, so it comes out bigger for names like Gonçalves; for plain English text the two agree.
- \`LEFT(s, n)\`, \`RIGHT(s, n)\`: the first or last n characters.
- \`SUBSTRING(s, start, length)\`: positions start at **1**, not 0.
- \`SUBSTRING_INDEX(s, delim, n)\`: everything before the n-th delimiter; with a negative n, everything after the n-th one from the end. \`SUBSTRING_INDEX(Email, '@', -1)\` is the email domain, \`SUBSTRING_INDEX(Email, '@', 1)\` the part before the @.
- \`REPLACE(s, from, to)\`, \`TRIM(s)\`.`,
        examples: [
          { sql: `SELECT FirstName, LastName,
       CONCAT(LEFT(FirstName, 1), '. ', UPPER(LastName)) AS ShortName,
       UPPER(SUBSTRING(LastName, 1, 3)) AS Code,
       LOWER(Title) AS Title,
       CHAR_LENGTH(LastName) AS Letters
FROM Employee;`, note: 'CONCAT, LEFT, UPPER, SUBSTRING, LOWER and CHAR_LENGTH on the 8 employees.' },
          { sql: `SELECT Email,
       SUBSTRING_INDEX(Email, '@', 1) AS UserPart,
       SUBSTRING_INDEX(Email, '@', -1) AS Domain
FROM Customer
LIMIT 5;`, note: 'Splitting an email at the @.' },
          { sql: `SELECT SUBSTRING_INDEX(Email, '@', -1) AS Domain, COUNT(*) AS Customers
FROM Customer
GROUP BY Domain
ORDER BY Customers DESC, Domain
LIMIT 5;`, note: 'Group by a calculated value: gmail.com wins with 8 customers.' },
        ],
      },
      {
        h: 'Dates',
        md: `InvoiceDate, BirthDate and HireDate are DATETIME values like \`2021-01-01 00:00:00\` (this site shows them without the midnight time, as \`2021-01-01\`). The everyday functions:

- \`YEAR(d)\`, \`MONTH(d)\`, \`DAY(d)\` pull out a number: "invoices in 2024" is \`WHERE YEAR(InvoiceDate) = 2024\`.
- \`DATE_FORMAT(d, '%Y-%m')\` turns a date into text. \`%Y\` four-digit year, \`%m\` month 01 to 12, \`%d\` day, \`%M\` month name. Grouping by \`DATE_FORMAT(InvoiceDate, '%Y-%m')\` gives one row per month, and it sorts correctly.
- \`DATEDIFF(later, earlier)\` is the number of days between two dates. Later date first, or the answer is negative.
- \`TIMESTAMPDIFF(unit, earlier, later)\` is the difference in YEAR, MONTH, DAY and so on, counting only completed units. Note the argument order is the opposite of DATEDIFF. \`TIMESTAMPDIFF(YEAR, BirthDate, HireDate)\` is the age when hired.
- \`NOW()\` and \`CURDATE()\` are today. Chinook's invoices end on 2025-12-22, so when a question gives a reference date, compare to that date rather than to today.`,
        examples: [
          { sql: `SELECT DATE_FORMAT(InvoiceDate, '%Y-%m') AS YearMonth, COUNT(*) AS Invoices, ROUND(SUM(Total), 2) AS Revenue
FROM Invoice
WHERE YEAR(InvoiceDate) = 2025
GROUP BY YearMonth
ORDER BY YearMonth;`, note: 'One row per month of 2025.' },
          { sql: `SELECT FirstName, LastName, BirthDate, HireDate,
       TIMESTAMPDIFF(YEAR, BirthDate, HireDate) AS AgeWhenHired
FROM Employee
ORDER BY AgeWhenHired;`, note: 'Jane Peacock was hired at 28, Margaret Park at 55.' },
          { sql: `SELECT CustomerId, MIN(InvoiceDate) AS FirstPurchase, MAX(InvoiceDate) AS LastPurchase,
       DATEDIFF(MAX(InvoiceDate), MIN(InvoiceDate)) AS DaysBetween
FROM Invoice
GROUP BY CustomerId
ORDER BY CustomerId
LIMIT 5;`, note: 'DATEDIFF(later, earlier): days between first and last purchase.' },
        ],
      },
      {
        h: 'Numbers',
        md: `- \`ROUND(x, 2)\` to two decimals, \`ROUND(x)\` to a whole number.
- \`FLOOR(x)\` and \`CEIL(x)\` round down and up.
- \`x DIV y\` is integer division; \`x % y\` (or \`MOD(x, y)\`) is the remainder.
- \`ABS(x)\` drops the sign.

Round at the end, not in the middle: \`ROUND(AVG(Total), 2)\`, not \`AVG(ROUND(Total, 2))\`.`,
        examples: [
          { sql: `SELECT Name, Milliseconds,
       Milliseconds DIV 60000 AS Mins,
       (Milliseconds % 60000) DIV 1000 AS Secs,
       CONCAT(Milliseconds DIV 60000, ':', LPAD((Milliseconds % 60000) DIV 1000, 2, '0')) AS Length
FROM Track
ORDER BY TrackId
LIMIT 5;`, note: '343719 ms is 5 minutes and 43 seconds: DIV for the minutes, % for what is left over. LPAD pads the seconds to two digits (3:05, not 3:5).' },
        ],
      },
    ],
    pitfalls: [
      `CASE stops at the first true WHEN. \`WHEN Total >= 5 THEN 'normal' WHEN Total >= 15 THEN 'big'\` never reaches 'big'. And every CASE needs its END.`,
      `\`CONCAT\` returns NULL if any argument is NULL. Wrap nullable columns in IFNULL or COALESCE.`,
      `\`||\` is OR in MySQL, not string concatenation. Use CONCAT.`,
      `\`DATEDIFF(later, earlier)\` but \`TIMESTAMPDIFF(unit, earlier, later)\`: the orders are opposite.`,
      `String positions start at 1: \`SUBSTRING(s, 1, 3)\` is the first three characters. \`SUBSTRING(s, 0, 3)\` returns an empty string in MySQL, not an error.`,
    ],
    practice: ['c01', 'c02', 'c03', 'c04', 'c05', 'c06'],
  },

  // ---------------------------------------------------------------- 9
  {
    id: 'unions',
    topic: 'set',
    title: 'UNION and UNION ALL',
    minutes: 5,
    blurb: 'Stack the results of two queries on top of each other, with or without removing duplicates.',
    sections: [
      {
        h: 'Stacking results',
        md: `A JOIN puts tables **side by side** (more columns). A UNION stacks query results **on top of each other** (more rows).

- \`UNION ALL\` keeps every row from both queries.
- \`UNION\` removes duplicate rows from the combined result, like a DISTINCT over everything.

Cities of customers and employees together: 67 rows with UNION ALL, but only 55 with UNION. UNION removes every repeat, not just the ones between the two queries: two customers live in Paris, five employees work in Calgary, and Edmonton shows up on both sides.

When duplicates are impossible, or wanted, use UNION ALL: it skips the de-duplication work.`,
        examples: [
          { sql: `SELECT COUNT(*) AS AllRows
FROM (SELECT City FROM Customer
      UNION ALL
      SELECT City FROM Employee) AS x;`, note: '67: 59 customers plus 8 employees.' },
          { sql: `SELECT COUNT(*) AS DifferentCities
FROM (SELECT City FROM Customer
      UNION
      SELECT City FROM Employee) AS x;`, note: '55: every city is kept once, whichever query it came from.' },
          { sql: `SELECT Country FROM Customer
UNION
SELECT Country FROM Employee
ORDER BY Country;`, note: 'Every country with a Chinook person in it: still 24, since all employees are in Canada.' },
        ],
      },
      {
        h: 'The rules',
        md: `1. Both queries must return the **same number of columns**.
2. Columns are matched **by position**, not by name, so keep them in the same order with compatible types (text with text, numbers with numbers).
3. The column names of the result come from the **first** query. Put your aliases there.
4. \`ORDER BY\` and \`LIMIT\` appear **once, at the very end**, and sort the combined result. An ORDER BY in the middle is a syntax error.`,
        examples: [
          { sql: `SELECT FirstName, LastName FROM Employee
UNION
SELECT FirstName FROM Customer;`, note: 'Deliberate error: 2 columns on top, 1 below.', expectError: true },
          { sql: `SELECT FirstName, LastName FROM Employee ORDER BY LastName
UNION
SELECT FirstName, LastName FROM Customer;`, note: 'Deliberate error: ORDER BY belongs after the last SELECT.', expectError: true },
        ],
      },
      {
        h: 'One contact list from two tables',
        md: `A classic task: "one list of every person, employees and customers, with their email". Both tables have FirstName, LastName and Email, so select those from each, and add a constant column that labels where each row came from: \`'Employee' AS Kind\` in the first query, plain \`'Customer'\` in the second (the column name comes from the first query anyway).

The same trick builds a small summary table out of unrelated queries.`,
        examples: [
          { sql: `SELECT FirstName, LastName, Email, 'Employee' AS Kind FROM Employee
UNION ALL
SELECT FirstName, LastName, Email, 'Customer' FROM Customer
ORDER BY LastName, FirstName;`, note: '67 people sorted together; Kind says who is who.' },
          { sql: `SELECT 'Artists' AS What, COUNT(*) AS HowMany FROM Artist
UNION ALL
SELECT 'Albums', COUNT(*) FROM Album
UNION ALL
SELECT 'Tracks', COUNT(*) FROM Track;`, note: 'Three counts from three tables in one result.' },
        ],
      },
    ],
    pitfalls: [
      `UNION silently removes duplicates. If every row should stay (for example, to count them), use UNION ALL.`,
      `Columns are matched by position: \`SELECT FirstName, LastName ... UNION SELECT LastName, FirstName ...\` runs without complaint and mixes up the columns.`,
      `One ORDER BY, at the end, using the column names of the first query.`,
      `INTERSECT and EXCEPT only exist from MySQL 8.0.31. If you're unsure of the version, write them as IN / NOT IN or EXISTS / NOT EXISTS subqueries, which work everywhere.`,
      `UNION is not a JOIN. "Each employee next to their customers" is a JOIN; "employees and customers in one list" is a UNION.`,
    ],
    practice: ['u01', 'u02', 'u03'],
  },

  // ---------------------------------------------------------------- 10
  {
    id: 'changing-data',
    topic: 'dml',
    title: 'Changing data: INSERT, UPDATE, DELETE, views and tables',
    minutes: 9,
    blurb: 'Statements that change the database (and how to run them safely), plus CREATE VIEW and CREATE TABLE with keys.',
    sections: [
      {
        h: 'INSERT',
        md: `> In the Playground, your changes stay until you press **Reset database**. Exercises always run on a fresh copy, so nothing you do there can break them.

\`INSERT INTO table (col1, col2, ...) VALUES (v1, v2, ...);\` Always write the column list: it documents what goes where and keeps working if the table gains columns.

Chinook's ids are plain \`INT\` primary keys, **not AUTO_INCREMENT**, so you supply the id yourself. Check the highest one first: \`SELECT MAX(ArtistId) FROM Artist\` is 275, so a new artist gets 276. Columns you leave out get their default value. Chinook's tables define no defaults, so a nullable column you leave out becomes NULL, and leaving out a NOT NULL column such as Customer.Email is an error ("Field 'Email' doesn't have a default value").

Several rows at once: \`VALUES (...), (...), (...)\`.`,
        examples: [
          { sql: `INSERT INTO Artist (ArtistId, Name) VALUES (276, 'The Joins');
SELECT * FROM Artist WHERE ArtistId >= 274;`, note: 'Insert, then look. Running a SELECT after every change is the habit to build.' },
          { sql: `INSERT INTO Genre (GenreId, Name) VALUES (26, 'K-Pop'), (27, 'Mizrahi');
SELECT * FROM Genre WHERE GenreId > 24;`, note: 'Two rows in one INSERT.' },
          { sql: `INSERT INTO Genre (GenreId, Name) VALUES (1, 'Rock again');`, note: 'Deliberate error: GenreId 1 already exists, and a primary key must be unique.', expectError: true },
        ],
      },
      {
        h: 'UPDATE ... WHERE',
        md: `\`UPDATE table SET col = value, col2 = value2 WHERE condition;\`

**The WHERE is everything.** Without it, every row changes: \`UPDATE Track SET UnitPrice = 0.49\` reprices all 3503 tracks. A good habit: write the WHERE as a SELECT first, check the rows it returns, then turn it into the UPDATE.

Separate the assignments with commas. The new value can use the old one (\`SET Total = Total * 1.1\`), and the WHERE can use a subquery to pick rows by something stored in another table.`,
        examples: [
          { sql: `UPDATE Track SET UnitPrice = 1.29 WHERE GenreId = 9;
SELECT UnitPrice, COUNT(*) AS Tracks FROM Track GROUP BY UnitPrice;`, note: 'The 48 Pop tracks now cost 1.29. Every other track is untouched.' },
          { sql: `UPDATE Customer SET Company = 'Freelance', SupportRepId = 4 WHERE CustomerId = 2;
SELECT CustomerId, FirstName, LastName, Company, SupportRepId FROM Customer WHERE CustomerId = 2;`, note: 'Two columns in one SET, one customer in the WHERE.' },
          { sql: `UPDATE Track SET UnitPrice = 1.49
WHERE AlbumId IN (SELECT AlbumId FROM Album WHERE ArtistId = 1);
SELECT UnitPrice, COUNT(*) AS Tracks FROM Track GROUP BY UnitPrice;`, note: 'A subquery picks the rows: all 18 AC/DC tracks (ArtistId 1).' },
        ],
      },
      {
        h: 'DELETE ... WHERE',
        md: `\`DELETE FROM table WHERE condition;\` removes whole rows. Same rule as UPDATE: no WHERE means an empty table. Preview with \`SELECT *\` and the same WHERE first.

Foreign keys protect the data. In MySQL you can't delete an artist who still has albums, or an invoice that still has lines: error 1451, "Cannot delete or update a parent row". Delete the children first (the InvoiceLine rows), then the parent (the Invoice).

> The practice database enforces foreign keys just like MySQL, so you can try this in the Playground and watch it refuse.`,
        examples: [
          { sql: `DELETE FROM InvoiceLine WHERE InvoiceId = 1;
DELETE FROM Invoice WHERE InvoiceId = 1;
SELECT COUNT(*) AS Invoices FROM Invoice;`, note: 'Children first, then the parent. 411 invoices left.' },
          { sql: `DELETE FROM PlaylistTrack WHERE PlaylistId = 18;
SELECT COUNT(*) AS TracksLeft FROM PlaylistTrack WHERE PlaylistId = 18;`, note: 'Empties the On-The-Go 1 playlist (it had a single track). The playlist itself stays.' },
        ],
      },
      {
        h: 'CREATE VIEW: a saved query',
        md: `A view is a named SELECT. It stores no data: every time you query it, its SELECT runs again on the current tables. Use one to give a complicated join a simple name.

After \`CREATE VIEW CustomerSpending AS SELECT ...;\`, you can write \`SELECT * FROM CustomerSpending\` as if it were a table. \`DROP VIEW CustomerSpending;\` removes it.

Every column of a view needs a unique name. A view that selects \`t.Name, g.Name\` fails in MySQL with "Duplicate column name 'Name'", so alias them (\`t.Name AS Track, g.Name AS Genre\`). Alias calculated columns too (\`AS Spent\`), or the column ends up named after the whole expression, like \`ROUND(SUM(i.Total), 2)\`.`,
        examples: [
          { sql: `CREATE VIEW CustomerSpending AS
SELECT c.CustomerId, CONCAT(c.FirstName, ' ', c.LastName) AS Customer, c.Country,
       ROUND(SUM(i.Total), 2) AS Spent
FROM Customer c
JOIN Invoice i ON i.CustomerId = c.CustomerId
GROUP BY c.CustomerId, c.FirstName, c.LastName, c.Country;

SELECT * FROM CustomerSpending ORDER BY Spent DESC, CustomerId LIMIT 5;`, note: 'Create once, then query it like a table.' },
        ],
      },
      {
        h: 'CREATE TABLE, primary and foreign keys',
        md: `\`\`\`sql
CREATE TABLE Review (
  ReviewId INT PRIMARY KEY,
  TrackId  INT NOT NULL,
  Stars    INT,
  Comment  VARCHAR(200),
  FOREIGN KEY (TrackId) REFERENCES Track(TrackId)
);
\`\`\`

- **Primary key**: identifies each row, so it is unique and never NULL. One per table, though it can span several columns, like PlaylistTrack's (PlaylistId, TrackId).
- **Foreign key**: a column whose value must exist as a key in the table it references, or be NULL if the column allows NULL (Employee.ReportsTo even references its own table). Every Review.TrackId must be a real TrackId. It's also what you will join on.
- Common types: \`INT\`, \`DECIMAL(10,2)\` for money, \`VARCHAR(n)\` for text, \`DATE\` and \`DATETIME\`.
- \`NOT NULL\` makes a column required. \`AUTO_INCREMENT\` (MySQL) numbers new rows for you; Chinook's own tables don't use it.`,
        examples: [
          { sql: `CREATE TABLE Review (
  ReviewId INT PRIMARY KEY,
  TrackId  INT NOT NULL,
  Stars    INT,
  Comment  VARCHAR(200),
  FOREIGN KEY (TrackId) REFERENCES Track(TrackId)
);
INSERT INTO Review (ReviewId, TrackId, Stars, Comment)
VALUES (1, 1, 5, 'Still loud'), (2, 2, 4, NULL);
SELECT r.ReviewId, t.Name AS Track, r.Stars, r.Comment
FROM Review r
JOIN Track t ON t.TrackId = r.TrackId;`, note: 'Create, fill, and join the new table to Track through its foreign key.' },
        ],
      },
    ],
    pitfalls: [
      `UPDATE or DELETE without WHERE changes every row in the table. Run the WHERE as a SELECT first.`,
      `\`UPDATE ... SET a = 1 AND b = 2\` is a bug, not two assignments: MySQL sets a to the result of \`1 AND b = 2\`. Use a comma: \`SET a = 1, b = 2\`.`,
      `Chinook ids are not AUTO_INCREMENT. An INSERT without the id fails in MySQL ("Field 'ArtistId' doesn't have a default value"); give it MAX + 1.`,
      `INSERT without a column list depends on the exact column order of the table. Always list the columns.`,
      `Deleting a parent row that still has children fails in MySQL because of the foreign keys. Delete the InvoiceLine rows before their Invoice.`,
    ],
    practice: ['d01', 'd02', 'd03', 'd04', 'd05', 'd06'],
  },

  // ---------------------------------------------------------------- 11
  {
    id: 'window-functions',
    topic: 'window',
    title: 'Window functions (bonus)',
    minutes: 8,
    blurb: 'Bonus, if your course covered it: ROW_NUMBER, RANK, DENSE_RANK, running totals, and the top-N-per-group pattern.',
    sections: [
      {
        h: 'What OVER() does',
        md: `> Bonus lesson. Window functions arrived in MySQL 8.0. If your course never covered them, the exam is unlikely to require them, and everything here can also be done with subqueries. If it did cover them, they make some questions much shorter.

GROUP BY collapses rows. A **window function** computes across a set of rows but keeps every row: each row gets its own result, next to its own columns.

\`\`\`sql
SUM(Total) OVER (PARTITION BY CustomerId)
\`\`\`

- \`PARTITION BY\` splits the rows into groups, like GROUP BY but without collapsing them. Leave it out and the whole result is one window.
- \`ORDER BY\` inside OVER sets an order within the window. For SUM it turns the total into a **running** total. Rows that tie on that ORDER BY (two invoices on the same date) are added in together and show the same running total.`,
        examples: [
          { sql: `SELECT InvoiceId, CustomerId, Total,
       ROUND(SUM(Total) OVER (PARTITION BY CustomerId), 2) AS CustomerTotal,
       ROUND(100 * Total / SUM(Total) OVER (PARTITION BY CustomerId), 1) AS PctOfCustomer
FROM Invoice
WHERE CustomerId IN (1, 2)
ORDER BY CustomerId, InvoiceId;`, note: 'Every invoice stays, and each one can see its customer\'s total.' },
          { sql: `SELECT InvoiceId, InvoiceDate, Total,
       ROUND(SUM(Total) OVER (ORDER BY InvoiceDate), 2) AS RunningTotal
FROM Invoice
WHERE CustomerId = 1
ORDER BY InvoiceDate;`, note: 'ORDER BY inside OVER: a running total of customer 1\'s spending, ending at 39.62. The ORDER BY at the end sorts the output; the one inside OVER only drives the total.' },
        ],
      },
      {
        h: 'ROW_NUMBER, RANK, DENSE_RANK',
        md: `All three number the rows in the order given inside OVER (ORDER BY ...). They only differ on ties:

- \`ROW_NUMBER()\`: 1, 2, 3, 4, 5. Always unique; ties are broken arbitrarily unless you add a second sort key (the example uses CustomerId).
- \`RANK()\`: 1, 2, 3, 4, 4, 6. Ties share a rank, then the numbering skips.
- \`DENSE_RANK()\`: 1, 2, 3, 4, 4, 5. Ties share, no gaps.

In the example, customers 45 and 46 both spent 45.62, and three customers tie at 43.62. Compare the three columns on those rows.`,
        examples: [
          { sql: `SELECT CustomerId, ROUND(SUM(Total), 2) AS Spent,
       ROW_NUMBER() OVER (ORDER BY SUM(Total) DESC, CustomerId) AS RowNum,
       RANK()       OVER (ORDER BY SUM(Total) DESC) AS Rnk,
       DENSE_RANK() OVER (ORDER BY SUM(Total) DESC) AS DenseRnk
FROM Invoice
GROUP BY CustomerId
ORDER BY Spent DESC, CustomerId
LIMIT 10;`, note: 'Window functions can run over grouped results: here, total spend per customer.' },
        ],
      },
      {
        h: 'Top N per group',
        md: `"The best-selling track in each genre", "the top 2 customers per country": rank the rows inside each group, then keep the ones ranked 1 (or up to N).

A window function can't be filtered in the WHERE of the same query (WHERE runs before SELECT, remember?). So wrap the ranking in a derived table and filter outside:

\`\`\`sql
SELECT ...
FROM (SELECT ..., ROW_NUMBER() OVER (PARTITION BY g.GenreId ORDER BY ... DESC) AS rn
      FROM ...) AS ranked
WHERE rn = 1;
\`\`\`

A Chinook twist: no track has sold more than twice, so most genres have many tracks tied at the top. \`ROW_NUMBER\` picks exactly one per genre (a second sort key makes the pick predictable); \`RANK\` would return every tied track.`,
        examples: [
          { sql: `SELECT Genre, Track, Sold
FROM (SELECT g.Name AS Genre, t.Name AS Track, SUM(il.Quantity) AS Sold,
             ROW_NUMBER() OVER (PARTITION BY g.GenreId ORDER BY SUM(il.Quantity) DESC, t.TrackId) AS rn
      FROM InvoiceLine il
      JOIN Track t ON t.TrackId = il.TrackId
      JOIN Genre g ON g.GenreId = t.GenreId
      GROUP BY g.GenreId, g.Name, t.TrackId, t.Name) AS ranked
WHERE rn = 1
ORDER BY Genre;`, note: 'One best seller per genre. Opera is missing: its only track never sold.' },
          { sql: `SELECT Country, Customer, Spent, Rnk
FROM (SELECT c.Country, CONCAT(c.FirstName, ' ', c.LastName) AS Customer,
             ROUND(SUM(i.Total), 2) AS Spent,
             RANK() OVER (PARTITION BY c.Country ORDER BY SUM(i.Total) DESC) AS Rnk
      FROM Customer c
      JOIN Invoice i ON i.CustomerId = c.CustomerId
      GROUP BY c.CustomerId, c.FirstName, c.LastName, c.Country) AS ranked
WHERE Rnk <= 2 AND Country IN ('USA', 'Canada', 'France', 'Brazil')
ORDER BY Country, Rnk, Customer;`, note: 'Top 2 per country with RANK: 12 rows, because four Brazilians tie for second and so do two Americans. ROW_NUMBER would keep exactly 2 per country.' },
          { sql: `SELECT Name, ROW_NUMBER() OVER (ORDER BY Milliseconds DESC) AS rn
FROM Track
WHERE ROW_NUMBER() OVER (ORDER BY Milliseconds DESC) <= 3;`, note: 'Deliberate error: a window function cannot go in WHERE.', expectError: true },
        ],
      },
      {
        h: 'The same without window functions',
        md: `Everything above has an older, subquery-only version, and it's worth knowing in case the exam expects it. "Top 1 per group" becomes a correlated subquery against the group's MAX: keep a track if its length equals the longest length in its own genre.

Unlike ROW_NUMBER, this returns every tied row.`,
        examples: [
          { sql: `SELECT g.Name AS Genre, t.Name AS Track, ROUND(t.Milliseconds / 60000, 1) AS Minutes
FROM Track t
JOIN Genre g ON g.GenreId = t.GenreId
WHERE t.Milliseconds = (SELECT MAX(t2.Milliseconds)
                        FROM Track t2
                        WHERE t2.GenreId = t.GenreId)
ORDER BY t.Milliseconds DESC;`, note: 'The longest track in each genre, no window function needed.' },
        ],
      },
    ],
    pitfalls: [
      `Window functions can't go in WHERE or HAVING. Compute them in a derived table and filter in the outer query.`,
      `\`rn <= N\` with ROW_NUMBER gives exactly N rows per group (if the group has that many); RANK and DENSE_RANK can give more when there are ties. Pick the one the question asks for.`,
      `PARTITION BY doesn't collapse rows. If you want one row per group, that's GROUP BY.`,
      `RANK is a reserved word in MySQL 8. Alias the column Rnk (or anything else), not rank.`,
      `Without an ORDER BY inside OVER, ROW_NUMBER numbers the rows in no particular order.`,
    ],
    practice: ['w01', 'w02', 'w03'],
  },
];
