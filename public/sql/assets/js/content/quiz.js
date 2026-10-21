// "Understand" section: reading and reasoning about SQL on Chinook (MySQL 8).
// Every number and row count below was checked against the real data with tools/sql.cjs.
// The practice engine reproduces MySQL's errors for the classic traps (alias in WHERE,
// ONLY_FULL_GROUP_BY, = with several rows, derived table alias, foreign keys), so Run shows them.

export const QUIZ = [
  // ---------------------------------------------------------------- basics
  {
    id: 'q-basics-1',
    topic: 'basics',
    kind: 'rows',
    prompt: `Chinook has 59 customers in 24 countries. How many rows does this return?`,
    sql: `SELECT DISTINCT Country, City
FROM Customer;`,
    options: ['59', '24', '53'],
    answer: 2,
    explain: `**53.** DISTINCT works on the *whole row* you select, not just the first column. Two rows count as duplicates only if Country **and** City both match.

- 59 is every customer, before DISTINCT removes anything.
- 24 is the number of countries. You'd get that from \`SELECT DISTINCT Country\` on its own.

Some customers share a city (two live in São Paulo, for example), so 59 rows shrink to 53 different (Country, City) pairs.`,
  },
  {
    id: 'q-basics-2',
    topic: 'basics',
    kind: 'order',
    prompt: `You *write* the clauses as SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT. In which order does MySQL logically *evaluate* them?`,
    options: [
      'SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT',
      'FROM → SELECT → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT',
      'FROM → GROUP BY → WHERE → HAVING → SELECT → ORDER BY → LIMIT',
      'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT',
    ],
    answer: 3,
    explain: `First MySQL needs rows to work with (**FROM**, joins included). **WHERE** throws away single rows, **GROUP BY** squashes what's left into groups, **HAVING** throws away whole groups, and only then does **SELECT** compute the output columns. **ORDER BY** sorts the finished result and **LIMIT** cuts it.

This one order explains three classic errors:
- WHERE can't use an aggregate like \`COUNT(*)\`: the groups don't exist yet.
- WHERE can't use a SELECT alias: SELECT hasn't run yet.
- ORDER BY *can* use a SELECT alias: it runs after SELECT.

The first option is simply the order you type the clauses in, which is not the order they run in.`,
  },
  {
    id: 'q-basics-3',
    topic: 'basics',
    kind: 'order',
    prompt: `MySQL answers this with *Unknown column 'Minutes' in 'where clause'*. Why?`,
    sql: `SELECT Name, Milliseconds / 60000 AS Minutes
FROM Track
WHERE Minutes > 20;`,
    options: [
      'WHERE is evaluated before SELECT, so the alias `Minutes` does not exist yet',
      '`Minutes` is a reserved word in MySQL',
      "Aliases must be quoted: `WHERE 'Minutes' > 20`",
      'You cannot divide inside SELECT',
    ],
    answer: 0,
    explain: `WHERE filters rows *before* SELECT computes anything, so at that moment there is no column called Minutes. Repeat the expression instead:

\`\`\`sql
SELECT Name, Milliseconds / 60000 AS Minutes
FROM Track
WHERE Milliseconds / 60000 > 20;
\`\`\`

That returns 212 tracks, mostly TV episodes. Quoting the alias is a trap: \`'Minutes'\` in single quotes is a piece of text, not a column, so you'd be comparing the word Minutes with 20. ORDER BY, which runs after SELECT, *can* use the alias.

> Run it: you'll see the same complaint MySQL makes, as a "MySQL says no" note.`,
  },
  {
    id: 'q-basics-4',
    topic: 'basics',
    kind: 'output',
    prompt: `How is this result sorted?`,
    sql: `SELECT FirstName, LastName, Country, City
FROM Customer
ORDER BY Country, City DESC;`,
    options: [
      'Country Z to A, and City Z to A',
      'City Z to A first, then Country A to Z',
      'Country A to Z, and inside each country, City Z to A',
      'An error: DESC has to be written after every column',
    ],
    answer: 2,
    explain: `ASC/DESC belongs to **one** column: the one right before it. \`Country\` has no keyword, so it gets the default, ASC. Only \`City\` is DESC.

So Argentina comes first, and inside Brazil the cities run São Paulo, São José dos Campos, Rio de Janeiro, Brasília. For both descending, write \`ORDER BY Country DESC, City DESC\`.

The second column is only a tie-breaker: it never reorders the countries, it only sorts rows *within* the same country.`,
  },
  {
    id: 'q-basics-5',
    topic: 'basics',
    kind: 'schema',
    prompt: `\`Customer.SupportRepId\` is a foreign key. What does it point to?`,
    options: [
      '`SupportRep.SupportRepId`, in a separate SupportRep table',
      '`Customer.CustomerId` (the table points at itself)',
      '`Invoice.CustomerId`',
      '`Employee.EmployeeId`',
    ],
    answer: 3,
    explain: `Chinook has no SupportRep table. A support rep is just an employee, so \`SupportRepId\` holds an \`EmployeeId\`:

\`\`\`sql
SELECT c.FirstName, c.LastName, e.FirstName AS Rep
FROM Customer c
JOIN Employee e ON e.EmployeeId = c.SupportRepId;
\`\`\`

Only three employees actually appear as reps: Jane Peacock (3), Margaret Park (4) and Steve Johnson (5), the Sales Support Agents. Notice the column names differ (SupportRepId vs EmployeeId): that's why you need to know the schema instead of joining on "same name". Chinook's self reference is a different column, \`Employee.ReportsTo\`.`,
  },

  // ---------------------------------------------------------------- filter
  {
    id: 'q-filter-1',
    topic: 'filter',
    kind: 'rows',
    prompt: `Chinook has 59 customers, and 3 of them are in California ('CA'). How many rows does this return?`,
    sql: `SELECT FirstName, LastName, State
FROM Customer
WHERE State <> 'CA';`,
    options: ['56', '30', '59', '27'],
    answer: 3,
    explain: `**27**, not 56. Only 30 customers have a State at all. The other 29, mostly in Europe, have State = NULL.

For them, \`NULL <> 'CA'\` is not TRUE, it's **UNKNOWN**, and WHERE keeps only rows where the condition is TRUE. So they quietly vanish: 30 with a state, minus 3 Californians, leaves 27.

If you really mean "everyone not in CA, including people with no state":

\`\`\`sql
WHERE State <> 'CA' OR State IS NULL
\`\`\``,
  },
  {
    id: 'q-filter-2',
    topic: 'filter',
    kind: 'blank',
    prompt: `Goal: every track with no composer recorded (there are 977). What goes in the blank?`,
    sql: `SELECT Name
FROM Track
WHERE Composer ____;`,
    runSql: `SELECT Name
FROM Track
WHERE Composer IS NULL;`,
    options: ['`IS NULL`', '`= NULL`', "`= ''`", '`IN (NULL)`'],
    answer: 0,
    explain: `NULL means "unknown", and comparing anything with an unknown gives UNKNOWN, never TRUE. So \`= NULL\` matches **0** rows, even for tracks whose Composer really is NULL. \`IN (NULL)\` is \`= NULL\` in disguise: also 0 rows.

\`IS NULL\` is the operator made for this job, and it returns all 977.

\`= ''\` looks for an *empty string*, which is a real value, not a missing one. No track in Chinook has an empty Composer, so that gives 0 too.`,
  },
  {
    id: 'q-filter-3',
    topic: 'filter',
    kind: 'output',
    prompt: `Which artists does this return?`,
    sql: `SELECT Name
FROM Artist
WHERE Name LIKE '_a%';`,
    options: [
      'Artists whose name starts with "a"',
      'Artists whose name contains an "a" anywhere',
      'Artists whose second character is "a", like Santana and Van Halen',
      'Artists whose name is exactly two characters long and ends in "a"',
    ],
    answer: 2,
    explain: `In LIKE, \`_\` means **exactly one** character and \`%\` means **any number** of characters (zero included). So \`'_a%'\` reads: one character, then "a", then anything. That's 52 artists, from Santana and Van Halen to Aaron Goldberg ("A", then "a").

- Starts with "a" would be \`'a%'\`.
- Contains "a" anywhere would be \`'%a%'\`.
- Exactly two characters ending in "a" would be \`'_a'\` (no %).

MySQL's default comparison ignores case, so \`'_A%'\` returns the same rows.`,
  },
  {
    id: 'q-filter-4',
    topic: 'filter',
    kind: 'rows',
    prompt: `The goal was "customers in the USA or Canada who are supported by employee 3". How many rows does this query actually return?`,
    sql: `SELECT FirstName, LastName, Country, SupportRepId
FROM Customer
WHERE Country = 'USA' OR Country = 'Canada' AND SupportRepId = 3;`,
    options: ['8', '18', '21', '13'],
    answer: 1,
    explain: `**18.** AND binds tighter than OR (like × before + in arithmetic), so MySQL reads it as:

\`\`\`sql
WHERE Country = 'USA' OR (Country = 'Canada' AND SupportRepId = 3)
\`\`\`

That's all 13 US customers (whoever their rep is) plus the 5 Canadians that rep 3 supports. The intended query needs parentheses:

\`\`\`sql
WHERE (Country = 'USA' OR Country = 'Canada') AND SupportRepId = 3
\`\`\`

which gives 8 (3 American + 5 Canadian). Or avoid the OR entirely: \`WHERE Country IN ('USA', 'Canada') AND SupportRepId = 3\`.`,
  },
  {
    id: 'q-filter-5',
    topic: 'filter',
    kind: 'output',
    prompt: `\`InvoiceDate\` is a DATETIME. Do these two filters count the same invoices on Chinook?`,
    sql: `SELECT
  (SELECT COUNT(*) FROM Invoice
   WHERE InvoiceDate BETWEEN '2023-01-01' AND '2023-12-31') AS WithBetween,
  (SELECT COUNT(*) FROM Invoice
   WHERE YEAR(InvoiceDate) = 2023) AS WithYear;`,
    options: [
      'No: BETWEEN leaves out its end points, so it loses Jan 1 and Dec 31',
      "No: you can't compare a DATETIME with a text string like '2023-01-01'",
      'Yes, and they would match on any data, whatever the times',
      'Yes, both give 83, but only because every InvoiceDate here is at 00:00:00. An invoice at 2023-12-31 14:30 would be missed by BETWEEN',
    ],
    answer: 3,
    explain: `BETWEEN is **inclusive** on both ends: \`x BETWEEN a AND b\` means \`x >= a AND x <= b\`. So the first option is wrong.

The catch is the time part. Against a DATETIME, \`'2023-12-31'\` means \`2023-12-31 00:00:00\`, the very first second of Dec 31. A row at 14:30 that day is *later* than the upper bound and would be dropped. In Chinook every InvoiceDate is at midnight, so both give 83 here, but the YEAR version (or \`>= '2023-01-01' AND < '2024-01-01'\`) is the one that's right for any data.

Comparing a DATETIME with a date string is completely normal in MySQL: it converts the string for you.`,
  },

  // ---------------------------------------------------------------- agg
  {
    id: 'q-agg-1',
    topic: 'agg',
    kind: 'output',
    prompt: `Track has 3503 rows, and 977 of them have no Composer (NULL). What does this return?`,
    sql: `SELECT COUNT(*), COUNT(Composer), COUNT(DISTINCT Composer)
FROM Track;`,
    options: ['3503, 2526, 853', '3503, 3503, 853', '2526, 2526, 853', '3503, 2526, 2526'],
    answer: 0,
    explain: `Three different questions:

- \`COUNT(*)\` counts **rows**: 3503. NULLs don't matter, a row is a row.
- \`COUNT(Composer)\` counts rows where Composer is **not NULL**: 3503 minus 977 = 2526.
- \`COUNT(DISTINCT Composer)\` counts **different** non-NULL composers: 853. Many tracks share a composer (Steve Harris alone is credited on 80 Iron Maiden tracks).

The tempting mistake is thinking COUNT(column) counts every row. It never counts NULLs.`,
  },
  {
    id: 'q-agg-2',
    topic: 'agg',
    kind: 'output',
    prompt: `No invoice in Chinook is billed to Israel. What comes back?`,
    sql: `SELECT SUM(Total) AS Revenue, COUNT(*) AS Invoices
FROM Invoice
WHERE BillingCountry = 'Israel';`,
    options: [
      'No rows at all',
      'One row: Revenue = 0, Invoices = 0',
      'One row: Revenue = NULL, Invoices = 0',
      'An error, because WHERE matched nothing',
    ],
    answer: 2,
    explain: `An aggregate query **without GROUP BY** always returns exactly one row, even when WHERE leaves nothing to aggregate.

In that row, COUNT of nothing is **0**, but SUM (and AVG, MIN, MAX) of nothing is **NULL**: there is no total to report. If you want a 0, ask for it: \`IFNULL(SUM(Total), 0)\`.

Add \`GROUP BY BillingCountry\` and the picture changes: nothing matches, so there are no groups, so you get **no rows at all**.`,
  },
  {
    id: 'q-agg-3',
    topic: 'agg',
    kind: 'bug',
    prompt: `Goal: tracks longer than the average track. What is wrong?`,
    sql: `SELECT Name, Milliseconds
FROM Track
WHERE Milliseconds > AVG(Milliseconds);`,
    broken: true,
    options: [
      'AVG needs a GROUP BY next to it',
      'It should say `HAVING Milliseconds > AVG(Milliseconds)` instead of WHERE',
      'AVG returns a decimal and Milliseconds is an integer, so they cannot be compared',
      'Aggregates are not allowed in WHERE: WHERE looks at one row at a time, before any average exists',
    ],
    answer: 3,
    explain: `WHERE checks rows one by one, before anything is grouped or averaged, so \`AVG(...)\` has nothing to work with there. MySQL says *Invalid use of group function* (error 1111).

Compute the average separately, with a subquery:

\`\`\`sql
SELECT Name, Milliseconds
FROM Track
WHERE Milliseconds > (SELECT AVG(Milliseconds) FROM Track);
\`\`\`

That's 494 tracks. The HAVING idea is tempting but wrong: without GROUP BY the whole table is one single group, and plain \`Milliseconds\` is not one value for that group, so MySQL 8 rejects that too. Comparing a decimal with an integer is perfectly fine.`,
  },
  {
    id: 'q-agg-4',
    topic: 'agg',
    kind: 'bug',
    prompt: `Goal: the name of the longest track. What is wrong?`,
    sql: `SELECT Name, MAX(Milliseconds)
FROM Track;`,
    options: [
      'It mixes a plain column (Name) with an aggregate and has no GROUP BY, so MySQL 8 rejects it',
      'Nothing: it returns the longest track and its length',
      'MAX only works on dates and decimals, not on integers',
      'It needs `GROUP BY Name`',
    ],
    answer: 0,
    explain: `MAX squashes all 3503 rows into **one** row. Name has thousands of different values: which one belongs in that single row? MySQL 8 refuses to guess (error 1140, because ONLY_FULL_GROUP_BY is on). Some databases (SQLite, old MySQL 5.6) quietly return a row anyway. Run it here and you'll get MySQL's objection as a note.

\`GROUP BY Name\` makes the error go away but answers a different question: the longest track *per name*, about 3250 rows.

What you want:

\`\`\`sql
SELECT Name, Milliseconds
FROM Track
ORDER BY Milliseconds DESC
LIMIT 1;
\`\`\`

or, to keep ties, \`WHERE Milliseconds = (SELECT MAX(Milliseconds) FROM Track)\`. (It's *Occupation / Precipice*, 88 minutes of Battlestar Galactica.) MAX works on numbers, text and dates alike.`,
  },
  {
    id: 'q-agg-5',
    topic: 'agg',
    kind: 'output',
    prompt: `13 of the 59 customers are in the USA. What are A and B?`,
    sql: `SELECT AVG(IF(Country = 'USA', 1, 0))    AS A,
       AVG(IF(Country = 'USA', 1, NULL)) AS B
FROM Customer;`,
    options: ['A ≈ 0.22 and B ≈ 0.22', 'A = 13 and B = 13', 'A ≈ 0.22 and B = NULL', 'A ≈ 0.22 and B = 1'],
    answer: 3,
    explain: `**A** averages 59 values: thirteen 1s and forty-six 0s. 13 / 59 ≈ 0.22, the share of US customers. A handy trick.

**B** looks almost the same, but non-US customers get NULL instead of 0, and **AVG skips NULLs**. Only the thirteen 1s are left, and their average is exactly 1.

NULL is not zero. SUM, AVG, MIN, MAX and COUNT(column) all ignore NULLs, which changes an average a lot when you expected zeros.`,
  },

  // ---------------------------------------------------------------- group
  {
    id: 'q-group-1',
    topic: 'group',
    kind: 'bug',
    prompt: `Goal: countries with more than 4 customers. What is wrong?`,
    sql: `SELECT Country, COUNT(*) AS Customers
FROM Customer
WHERE COUNT(*) > 4
GROUP BY Country;`,
    broken: true,
    options: [
      'It should be `COUNT(Country)`, not `COUNT(*)`',
      'Use the alias instead: `WHERE Customers > 4`',
      'WHERE runs before grouping, so there are no counts yet: the condition belongs in HAVING',
      'GROUP BY has to come before WHERE',
    ],
    answer: 2,
    explain: `WHERE filters **rows**, before GROUP BY builds groups, so a per-country count doesn't exist yet. Conditions on groups go in **HAVING**, after GROUP BY:

\`\`\`sql
SELECT Country, COUNT(*) AS Customers
FROM Customer
GROUP BY Country
HAVING COUNT(*) > 4;
\`\`\`

That gives USA (13), Canada (8), France (5) and Brazil (5).

The alias doesn't help in WHERE either: SELECT hasn't run yet when WHERE does. And the written order is fixed: WHERE, then GROUP BY, then HAVING.`,
  },
  {
    id: 'q-group-2',
    topic: 'group',
    kind: 'rows',
    prompt: `Employee 3 (Jane) supports 21 customers. How many rows does this return?`,
    sql: `SELECT Country, COUNT(*) AS Customers
FROM Customer
WHERE SupportRepId = 3
GROUP BY Country
HAVING COUNT(*) >= 2;`,
    options: ['7', '21', '10', '9'],
    answer: 0,
    explain: `Follow the order MySQL works in:

1. **WHERE** keeps Jane's 21 customers.
2. **GROUP BY** turns them into 10 groups, one per country.
3. **HAVING** keeps the groups with at least 2 customers: Brazil, Canada, France, Germany, India, United Kingdom and USA. That's **7**.

21 forgets the grouping, 10 forgets the HAVING, and 9 is what you'd get if you forgot the WHERE (countries with 2+ customers across *all* reps).`,
  },
  {
    id: 'q-group-3',
    topic: 'group',
    kind: 'bug',
    prompt: `Goal: each artist with their number of albums. MySQL 8 refuses to run it. Why?`,
    sql: `SELECT ar.Name, al.Title, COUNT(*) AS Albums
FROM Artist ar
JOIN Album al ON al.ArtistId = ar.ArtistId
GROUP BY ar.ArtistId, ar.Name;`,
    options: [
      '`COUNT(*)` should be `COUNT(al.AlbumId)`',
      'You cannot GROUP BY a text column',
      'Nothing is wrong: MySQL shows the first album title for each artist',
      '`al.Title` is neither in GROUP BY nor inside an aggregate, and an artist has several albums',
    ],
    answer: 3,
    explain: `After GROUP BY, each artist is **one** row. AC/DC has 2 albums, Iron Maiden has 21: which Title should that single row show? There's no right answer, so MySQL 8 (ONLY_FULL_GROUP_BY is on by default) stops with error 1055.

The rule: every column in SELECT must either be in GROUP BY or be inside an aggregate. Fix it by dropping \`al.Title\`, or by aggregating it: \`MIN(al.Title)\`, or \`GROUP_CONCAT(al.Title SEPARATOR ', ')\` for the full list.

"Shows the first title" is how old MySQL 5.6 and SQLite behave: they silently pick some row. MySQL 8 refuses, and so does Run here. \`COUNT(*)\` is fine in an inner join: there are no NULL-filled rows to worry about.`,
  },
  {
    id: 'q-group-4',
    topic: 'group',
    kind: 'output',
    prompt: `Asked "which customer has the most invoices?", someone writes this. What does the answer really tell you?`,
    sql: `SELECT CustomerId, COUNT(*) AS Invoices
FROM Invoice
GROUP BY CustomerId
ORDER BY Invoices DESC
LIMIT 1;`,
    options: [
      'The one customer who has more invoices than everyone else',
      'One of the 58 customers tied at 7 invoices, picked arbitrarily',
      'The customer with the highest CustomerId',
      'Nothing: ORDER BY cannot use the alias Invoices',
    ],
    answer: 1,
    explain: `Chinook is very regular: 58 customers have exactly 7 invoices and one (customer 59) has 6. There is no single "top" customer. ORDER BY puts 58 tied rows at the top in no guaranteed order, and LIMIT 1 keeps whichever comes first. It *looks* like a confident answer and hides a 58-way tie.

When ties are possible, compare with the maximum instead:

\`\`\`sql
SELECT CustomerId, COUNT(*) AS Invoices
FROM Invoice
GROUP BY CustomerId
HAVING COUNT(*) = (SELECT MAX(n)
                   FROM (SELECT COUNT(*) AS n
                         FROM Invoice
                         GROUP BY CustomerId) AS x);
\`\`\`

And yes, ORDER BY can use a SELECT alias: it runs after SELECT.`,
  },
  {
    id: 'q-group-5',
    topic: 'group',
    kind: 'pick-query',
    prompt: `Which query lists the customers whose invoices add up to more than $45, with their total?`,
    optionsSql: true,
    options: [
      `SELECT CustomerId, SUM(Total)
FROM Invoice
WHERE Total > 45
GROUP BY CustomerId;`,
      `SELECT i.CustomerId, SUM(i.Total)
FROM Invoice i
JOIN InvoiceLine il ON il.InvoiceId = i.InvoiceId
GROUP BY i.CustomerId
HAVING SUM(i.Total) > 45;`,
      `SELECT CustomerId, SUM(Total)
FROM Invoice
GROUP BY CustomerId
HAVING SUM(Total) > 45;`,
      `SELECT CustomerId, SUM(Total)
FROM Invoice
WHERE SUM(Total) > 45
GROUP BY CustomerId;`,
    ],
    answer: 2,
    reference: `SELECT CustomerId, SUM(Total) AS Spent FROM Invoice GROUP BY CustomerId HAVING Spent > 45`,
    explain: `The condition is about each customer's **sum**, so it belongs in HAVING, after grouping. That's the third query: 5 customers, led by customer 6 with 49.62.

- The first filters single **invoices** over $45 before adding anything up. The biggest invoice in Chinook is 25.86, so it returns nothing.
- The second joins InvoiceLine, which repeats each invoice once per line, so every Total is added several times. Suddenly all 59 customers "spent" over $300.
- The fourth puts an aggregate in WHERE: an error.`,
  },
  {
    id: 'q-group-6',
    topic: 'group',
    kind: 'order',
    prompt: `Does MySQL accept the alias \`n\` in HAVING and ORDER BY here?`,
    sql: `SELECT Country, COUNT(*) AS n
FROM Customer
GROUP BY Country
HAVING n > 4
ORDER BY n DESC;`,
    options: [
      'Yes: MySQL lets HAVING and ORDER BY use SELECT aliases (only WHERE cannot)',
      'No: HAVING runs before SELECT, so it cannot see n',
      'Only ORDER BY may use n; HAVING must repeat COUNT(*)',
      'No: aliases can only be used in WHERE',
    ],
    answer: 0,
    explain: `It runs and returns 4 countries: USA (13), Canada (8), then France and Brazil (5 each).

**ORDER BY** runs after SELECT, so aliases are fine there in every database. **HAVING** is the interesting one: logically it runs before SELECT, and standard SQL says it shouldn't see aliases, but MySQL allows it as an extension. **WHERE** can never use them.

For a version that works everywhere (and satisfies a strict grader), write \`HAVING COUNT(*) > 4\`. It costs nothing.`,
  },
  {
    id: 'q-group-7',
    topic: 'group',
    kind: 'blank',
    prompt: `Goal: how many **different customers** were billed in each country. What goes in the blank?`,
    sql: `SELECT BillingCountry, ____ AS Customers
FROM Invoice
GROUP BY BillingCountry;`,
    runSql: `SELECT BillingCountry, COUNT(DISTINCT CustomerId) AS Customers
FROM Invoice
GROUP BY BillingCountry;`,
    options: ['`COUNT(*)`', '`COUNT(DISTINCT CustomerId)`', '`COUNT(CustomerId)`', '`SUM(CustomerId)`'],
    answer: 1,
    explain: `One row of Invoice is one **invoice**, and each customer has about 7 of them. So \`COUNT(*)\` counts invoices: 91 for the USA. \`COUNT(CustomerId)\` gives the same 91, because CustomerId is never NULL.

\`COUNT(DISTINCT CustomerId)\` counts each customer once: 13 for the USA. Before choosing a COUNT, always ask "one row of this table is one *what*?"

\`SUM(CustomerId)\` adds up ID numbers, which means nothing (2002 for the USA).`,
  },

  // ---------------------------------------------------------------- join
  {
    id: 'q-join-1',
    topic: 'join',
    kind: 'rows',
    prompt: `Artist has 275 rows, Album has 347, and 71 artists have no album. How many rows does this return?`,
    sql: `SELECT ar.Name, al.Title
FROM Artist ar
LEFT JOIN Album al ON al.ArtistId = ar.ArtistId;`,
    options: ['418', '275', '347', '71'],
    answer: 0,
    explain: `A LEFT JOIN keeps every match **and** every left row that found no match.

- Every album matches exactly one artist: 347 rows (that's what an INNER JOIN gives).
- The 71 artists without albums are kept too, once each, with NULL in Title.

347 + 71 = **418**. It isn't 275, because an artist with 3 albums appears 3 times. A LEFT JOIN can make the left table longer, never shorter.`,
  },
  {
    id: 'q-join-2',
    topic: 'join',
    kind: 'blank',
    prompt: `Goal: artists that have **no** albums. What goes in the blank?`,
    sql: `SELECT ar.Name
FROM Artist ar
LEFT JOIN Album al ON al.ArtistId = ar.ArtistId
WHERE ____ IS NULL;`,
    runSql: `SELECT ar.Name
FROM Artist ar
LEFT JOIN Album al ON al.ArtistId = ar.ArtistId
WHERE al.AlbumId IS NULL;`,
    options: ['`ar.ArtistId`', '`ar.Name`', '`COUNT(al.AlbumId)`', '`al.AlbumId`'],
    answer: 3,
    explain: `When an artist has no album, the LEFT JOIN fills **all the Album columns** with NULL. So test a column from the *right* table that is never NULL in real data, ideally its primary key: \`al.AlbumId\`. That gives the 71 artists without albums.

\`ar.ArtistId\` and \`ar.Name\` come from the left table and are filled in on every row, so the query returns nothing. \`COUNT(...)\` is an aggregate, which isn't allowed in WHERE.

(\`al.ArtistId\` or \`al.Title\` would also work, since neither is ever NULL in Album, but the right table's primary key is the safe habit.)`,
  },
  {
    id: 'q-join-3',
    topic: 'join',
    kind: 'output',
    prompt: `Andrew, the General Manager, supports no customers. What number does this show for him?`,
    sql: `SELECT e.FirstName, COUNT(*) AS Customers
FROM Employee e
LEFT JOIN Customer c ON c.SupportRepId = e.EmployeeId
GROUP BY e.EmployeeId, e.FirstName;`,
    options: ['0', '1', 'NULL', 'Andrew is not in the result'],
    answer: 1,
    explain: `**1**, and so does every other employee without customers. The LEFT JOIN keeps Andrew as one row with NULL in all the Customer columns, and \`COUNT(*)\` counts rows, NULL-filled or not.

Count a column from the right table instead, and the NULL row is skipped:

\`\`\`sql
COUNT(c.CustomerId) AS Customers
\`\`\`

Now Andrew gets 0, while Jane, Margaret and Steve keep their 21, 20 and 18. He *is* in the result: keeping him is the whole point of the LEFT JOIN (an INNER JOIN would drop him).`,
  },
  {
    id: 'q-join-4',
    topic: 'join',
    kind: 'rows',
    prompt: `Employee has 8 rows. \`ReportsTo\` holds the EmployeeId of each person's manager (NULL for the boss). How many rows does this return?`,
    sql: `SELECT e.FirstName AS Employee, m.FirstName AS Manager
FROM Employee e
JOIN Employee m ON e.ReportsTo = m.EmployeeId;`,
    options: ['8', '7', '3', '64'],
    answer: 1,
    explain: `This is a **self join**: the same table twice, once as the employee (\`e\`) and once as the manager (\`m\`).

Andrew is the General Manager, so his ReportsTo is NULL. NULL never equals anything, so his row finds no manager and the inner JOIN drops it: **7** rows. To keep him (with a NULL manager), use \`LEFT JOIN Employee m\`.

3 is the number of different managers (Andrew, Nancy and Michael), and 64 is every employee paired with every employee: a join with no condition.`,
  },
  {
    id: 'q-join-5',
    topic: 'join',
    kind: 'bug',
    prompt: `Customer 1 (Luís) really spent 39.62 in total. Why does this query say 338.62?`,
    sql: `SELECT c.FirstName, SUM(i.Total) AS Spent
FROM Customer c
JOIN Invoice i ON i.CustomerId = c.CustomerId
JOIN InvoiceLine il ON il.InvoiceId = i.InvoiceId
WHERE c.CustomerId = 1
GROUP BY c.CustomerId, c.FirstName;`,
    options: [
      'Joining InvoiceLine repeats each invoice once per line, so each Total is added many times',
      'SUM counts NULL totals as 0',
      'It needs `GROUP BY i.InvoiceId` as well',
      'Invoice.Total includes tax; the real amount lives in Track',
    ],
    answer: 0,
    explain: `After the join there is one row per **invoice line**, not per invoice. Luís's invoice of 13.86 has 14 lines, so its Total appears in 14 rows and gets added 14 times. Over his 7 invoices, that inflates 39.62 to 338.62.

Two clean fixes:
- Don't join InvoiceLine at all. You don't need it to add up \`i.Total\`.
- If you do need the lines, add up the line amounts instead: \`SUM(il.UnitPrice * il.Quantity)\` gives 39.62.

Grouping by invoice as well just gives per-invoice sums that are still multiplied. Total has no NULLs and no tax: it is exactly the sum of its lines.`,
  },
  {
    id: 'q-join-6',
    topic: 'join',
    kind: 'bug',
    prompt: `Goal: **all 8** employees, each with their number of US customers (0 for most). It returns only 3 rows. Why?`,
    sql: `SELECT e.FirstName, COUNT(c.CustomerId) AS UsaCustomers
FROM Employee e
LEFT JOIN Customer c ON c.SupportRepId = e.EmployeeId
WHERE c.Country = 'USA'
GROUP BY e.EmployeeId, e.FirstName;`,
    options: [
      '`COUNT(c.CustomerId)` hides employees whose count is 0',
      'It needs a RIGHT JOIN instead',
      "'USA' has to be written in lowercase",
      'WHERE runs after the join and throws away the NULL rows, so the LEFT JOIN acts like an INNER JOIN',
    ],
    answer: 3,
    explain: `The LEFT JOIN does keep Andrew, Nancy and the others, with NULL in every Customer column. Then WHERE tests \`c.Country = 'USA'\`, which is UNKNOWN for NULL, and those rows are gone. Only Jane (3), Margaret (6) and Steve (4) survive.

Move the condition into **ON**, so it decides which customers *match*, not which rows *survive*:

\`\`\`sql
LEFT JOIN Customer c
  ON c.SupportRepId = e.EmployeeId AND c.Country = 'USA'
\`\`\`

Now all 8 employees come back, five of them with 0. COUNT never removes a group, and the text comparison ignores case anyway.`,
  },
  {
    id: 'q-join-7',
    topic: 'join',
    kind: 'pick-query',
    prompt: `Which query lists the names of the tracks on the playlist called 'Grunge'?`,
    optionsSql: true,
    options: [
      `SELECT t.Name
FROM Playlist p
JOIN Track t ON t.TrackId = p.PlaylistId
WHERE p.Name = 'Grunge';`,
      `SELECT t.Name
FROM Track t
JOIN Genre g ON g.GenreId = t.GenreId
WHERE g.Name = 'Grunge';`,
      `SELECT t.Name
FROM Playlist p
JOIN PlaylistTrack pt ON pt.PlaylistId = p.PlaylistId
JOIN Track t ON t.TrackId = pt.PlaylistId
WHERE p.Name = 'Grunge';`,
      `SELECT t.Name
FROM Playlist p
JOIN PlaylistTrack pt ON pt.PlaylistId = p.PlaylistId
JOIN Track t ON t.TrackId = pt.TrackId
WHERE p.Name = 'Grunge';`,
    ],
    answer: 3,
    reference: `SELECT t.Name FROM Track t WHERE t.TrackId IN (SELECT pt.TrackId FROM PlaylistTrack pt JOIN Playlist p ON p.PlaylistId = pt.PlaylistId WHERE p.Name = 'Grunge')`,
    explain: `A playlist holds many tracks and a track can sit on many playlists: a **many-to-many** relationship. Neither table has a column pointing at the other, so the link lives in the bridge table **PlaylistTrack** (PlaylistId, TrackId). It takes two joins: Playlist to PlaylistTrack on PlaylistId, then PlaylistTrack to Track on **TrackId**. The last query does exactly that: 15 tracks.

- The first matches a TrackId with a PlaylistId. Both are numbers, so it runs, but it pairs playlist 16 with track 16: one meaningless row.
- The second looks in **Genre**. Grunge is a playlist here, not a genre, so it returns nothing.
- The third goes through PlaylistTrack but then joins Track on \`pt.PlaylistId\`: that same wrong track 16, fifteen times.`,
  },
  {
    id: 'q-join-8',
    topic: 'join',
    kind: 'rows',
    prompt: `Genre has 25 rows and MediaType has 5. How many rows does this return?`,
    sql: `SELECT g.Name AS Genre, m.Name AS MediaType
FROM Genre g, MediaType m;`,
    options: ['25', '5', '125', '30'],
    answer: 2,
    explain: `A comma between tables with no join condition is a **cross join**: every row of the first table paired with every row of the second. 25 × 5 = **125**.

This is what you get when you forget the ON (or the WHERE condition, in the old comma style). With big tables it explodes: Track × InvoiceLine would be almost 8 million rows. If a row count looks like the product of two table sizes, look for a missing join condition.`,
  },
  {
    id: 'q-join-9',
    topic: 'join',
    kind: 'schema',
    prompt: `PlaylistTrack has just two columns, PlaylistId and TrackId. What is its primary key?`,
    sql: `DESCRIBE PlaylistTrack;`,
    options: [
      'PlaylistId on its own',
      'The pair (PlaylistId, TrackId) together',
      'TrackId on its own',
      "It has none: bridge tables don't need a primary key",
    ],
    answer: 1,
    explain: `Each column repeats on its own: playlist 1 holds 3290 tracks, and many tracks sit on several playlists. So neither column can identify a row by itself. The **pair** is unique: a given track appears at most once on a given playlist. That's a **composite primary key**, and \`DESCRIBE\` marks both columns as PRI.

Each column is also a foreign key: PlaylistId points to Playlist, TrackId points to Track. That's the standard shape of a bridge table for a many-to-many relationship.`,
  },
  {
    id: 'q-join-10',
    topic: 'join',
    kind: 'schema',
    prompt: `You need the genres that the customer Luís Gonçalves has bought. Which tables does the query have to join?`,
    options: [
      'Customer, Invoice, InvoiceLine, Track, Genre',
      'Customer, Invoice, Genre',
      'Customer, InvoiceLine, Track, Genre',
      'Customer, Invoice, InvoiceLine, Genre',
    ],
    answer: 0,
    explain: `Follow the foreign keys, one hop at a time:

1. **Customer** to **Invoice** on CustomerId (who bought)
2. **Invoice** to **InvoiceLine** on InvoiceId (what was on each invoice)
3. **InvoiceLine** to **Track** on TrackId (which track)
4. **Track** to **Genre** on GenreId (its genre)

You can't skip a table in the middle: InvoiceLine has no CustomerId, Invoice has no TrackId, and InvoiceLine has no GenreId. Track is the easiest one to forget, since you select nothing from it, but it's the only place GenreId lives.

\`\`\`sql
SELECT DISTINCT g.Name
FROM Customer c
JOIN Invoice i      ON i.CustomerId = c.CustomerId
JOIN InvoiceLine il ON il.InvoiceId = i.InvoiceId
JOIN Track t        ON t.TrackId = il.TrackId
JOIN Genre g        ON g.GenreId = t.GenreId
WHERE c.FirstName = 'Luís' AND c.LastName = 'Gonçalves';
\`\`\`

(8 genres, from Rock to Reggae.)`,
  },
  {
    id: 'q-join-11',
    topic: 'join',
    kind: 'schema',
    prompt: `Both Track and InvoiceLine have a \`UnitPrice\` column. To compute **revenue per genre**, what should you add up?`,
    options: [
      '`t.UnitPrice` from Track',
      '`i.Total` from Invoice',
      '`il.UnitPrice * il.Quantity` from InvoiceLine',
      'Either UnitPrice: one is just a copy of the other',
    ],
    answer: 2,
    explain: `**Track.UnitPrice** is the catalog price, today. **InvoiceLine.UnitPrice** is the price actually charged on that sale, frozen at the moment it happened. Revenue is money that came in, so it comes from InvoiceLine: \`SUM(il.UnitPrice * il.Quantity)\`.

In Chinook the two prices happen to match on every sale (and Quantity is always 1), so using Track's price may give the same number today. It's still the wrong column: change a track's price tomorrow and your "revenue" for past years would change with it.

\`i.Total\` is per invoice, and one invoice mixes several genres, so it can't be split by genre (and joining it to the lines repeats it, the join-multiplication trap).`,
  },

  // ---------------------------------------------------------------- subq
  {
    id: 'q-subq-1',
    topic: 'subq',
    kind: 'rows',
    prompt: `Goal: employees who manage nobody (no one's ReportsTo points at them). How many rows does this return?`,
    sql: `SELECT FirstName, LastName
FROM Employee
WHERE EmployeeId NOT IN (SELECT ReportsTo FROM Employee);`,
    options: ['5', '3', '8', '0'],
    answer: 3,
    explain: `**0**: the famous NOT IN trap. The subquery returns the ReportsTo values: NULL, 1, 2, 2, 2, 1, 6, 6. That first NULL is Andrew, who reports to nobody.

\`x NOT IN (1, 2, 6, NULL)\` means \`x <> 1 AND x <> 2 AND x <> 6 AND x <> NULL\`. The last part is UNKNOWN for every x, so the whole condition is never TRUE and no row survives.

Remove the NULL and you get the 5 you expected (Jane, Margaret, Steve, Robert, Laura):

\`\`\`sql
WHERE EmployeeId NOT IN (SELECT ReportsTo FROM Employee
                         WHERE ReportsTo IS NOT NULL)
\`\`\`

\`NOT EXISTS\` doesn't have this problem. 3 is the opposite question (\`IN\`: the managers).`,
  },
  {
    id: 'q-subq-2',
    topic: 'subq',
    kind: 'bug',
    prompt: `Goal: every Led Zeppelin track (ArtistId 22). What is wrong in MySQL?`,
    sql: `SELECT Name
FROM Track
WHERE AlbumId = (SELECT AlbumId FROM Album WHERE ArtistId = 22);`,
    broken: true,
    options: [
      'Nothing: it returns all 114 Led Zeppelin tracks',
      'A subquery cannot read a different table than the outer query',
      'The subquery returns 14 album ids, and `=` needs exactly one value: use `IN`',
      'Subqueries are not allowed in WHERE; it needs a JOIN',
    ],
    answer: 2,
    explain: `\`=\` compares with **one** value. Led Zeppelin has 14 albums, so the subquery returns 14 rows, and MySQL stops with *Subquery returns more than 1 row* (error 1242). Use \`IN\` for "any of these":

\`\`\`sql
WHERE AlbumId IN (SELECT AlbumId FROM Album WHERE ArtistId = 22)
\`\`\`

That returns all 114 tracks. A sneaky detail: some databases (SQLite, for one) don't complain and silently use only the first value, giving the tracks of one album. MySQL raises the error, and Run here does the same.

Rule of thumb: \`=\`, \`<\` and \`>\` need a subquery that returns one value (like \`SELECT MAX(...)\`). If it can return several, use IN, or ANY/ALL.`,
  },
  {
    id: 'q-subq-3',
    topic: 'subq',
    kind: 'output',
    prompt: `In plain words, which tracks does this return?`,
    sql: `SELECT t.Name, t.Milliseconds
FROM Track t
WHERE t.Milliseconds > (SELECT AVG(t2.Milliseconds)
                        FROM Track t2
                        WHERE t2.AlbumId = t.AlbumId);`,
    options: [
      'Tracks longer than the average length of their own album',
      'Tracks longer than the average track in the whole table',
      'The single longest track of each album',
      'Nothing: the subquery cannot use t, which belongs to the outer query',
    ],
    answer: 0,
    explain: `This is a **correlated** subquery: it mentions \`t.AlbumId\` from the outer query, so it is worked out again for each outer track. For a track on album 5 it averages album 5, for a track on album 9 it averages album 9. Result: 1559 tracks that beat their own album's average.

Without the \`WHERE t2.AlbumId = t.AlbumId\` line, it would be one average for the whole table (494 tracks, because the long TV episodes pull that average up). An inner query is allowed to see the outer query's aliases; that's exactly what makes it correlated.

"Longest of each album" would be \`=\` the album's MAX, not \`>\` its AVG.`,
  },
  {
    id: 'q-subq-4',
    topic: 'subq',
    kind: 'pick-query',
    prompt: `Which query lists the tracks that were **never sold**?`,
    optionsSql: true,
    options: [
      `SELECT TrackId, Name
FROM Track
WHERE NOT EXISTS (SELECT 1 FROM InvoiceLine);`,
      `SELECT TrackId, Name
FROM Track
WHERE TrackId NOT IN (SELECT TrackId FROM InvoiceLine);`,
      `SELECT TrackId, Name
FROM Track
WHERE TrackId NOT IN (SELECT InvoiceLineId FROM InvoiceLine);`,
      `SELECT t.TrackId, t.Name
FROM Track t
JOIN InvoiceLine il ON il.TrackId = t.TrackId
WHERE il.TrackId IS NULL;`,
    ],
    answer: 1,
    reference: `SELECT t.TrackId, t.Name FROM Track t LEFT JOIN InvoiceLine il ON il.TrackId = t.TrackId WHERE il.InvoiceLineId IS NULL`,
    explain: `The second query is right: 1519 tracks never appear on any invoice line. NOT IN is safe here because \`InvoiceLine.TrackId\` is never NULL (compare the NOT IN trap with ReportsTo).

- The first forgot to **correlate**: the subquery never mentions the outer track, so it only asks "does InvoiceLine have any rows at all?". It does, so NOT EXISTS is false for every track: 0 rows. The fix is \`WHERE NOT EXISTS (SELECT 1 FROM InvoiceLine il WHERE il.TrackId = Track.TrackId)\`.
- The third compares TrackId with **InvoiceLineId**, a different kind of id that just happens to use similar numbers. It returns 1263 tracks for no real reason.
- The fourth is an INNER JOIN, which keeps only tracks that *were* sold, so \`il.TrackId IS NULL\` is never true. That pattern needs a LEFT JOIN.`,
  },
  {
    id: 'q-subq-5',
    topic: 'subq',
    kind: 'bug',
    prompt: `Goal: the average number of invoices per customer. MySQL rejects it. Why?`,
    sql: `SELECT AVG(n)
FROM (SELECT CustomerId, COUNT(*) AS n
      FROM Invoice
      GROUP BY CustomerId);`,
    options: [
      'You cannot aggregate a column that comes from a subquery',
      '`COUNT(*)` must be `COUNT(CustomerId)`',
      'A subquery in FROM cannot contain GROUP BY',
      'The subquery in FROM (a derived table) has no alias, and MySQL requires one',
    ],
    answer: 3,
    explain: `In MySQL, every subquery in FROM acts as a temporary table, and it **must have a name**: *Every derived table must have its own alias* (error 1248). Add one after the closing parenthesis:

\`\`\`sql
SELECT AVG(n)
FROM (SELECT CustomerId, COUNT(*) AS n
      FROM Invoice
      GROUP BY CustomerId) AS per_customer;
\`\`\`

That returns about 6.98 (412 invoices over 59 customers). Aggregating over a derived table is completely normal: it's the standard way to get "an aggregate of an aggregate", like an average of counts. Run it to see MySQL's complaint about the missing alias.`,
  },
  {
    id: 'q-subq-6',
    topic: 'subq',
    kind: 'rows',
    prompt: `Artist has 275 rows and Album has 347. How many rows does this return?`,
    sql: `SELECT Name
FROM Artist
WHERE ArtistId IN (SELECT ArtistId FROM Album);`,
    options: ['275', '347', '204', '71'],
    answer: 2,
    explain: `**204**: one row per artist who has at least one album. IN only asks "is this ArtistId somewhere in that list?", so Iron Maiden, with 21 albums, still appears once.

A JOIN behaves differently: \`Artist JOIN Album\` gives one row **per album**, 347 rows, with Iron Maiden repeated 21 times. That's the practical difference: a subquery with IN (or EXISTS) filters, a JOIN can multiply.

275 is every artist, and 71 is the artists *without* albums (275 minus 204), which NOT IN would give.`,
  },
  {
    id: 'q-subq-7',
    topic: 'subq',
    kind: 'output',
    prompt: `Album 1 has 10 tracks, lasting from 199,836 ms to 343,719 ms. What does this return?`,
    sql: `SELECT Name, Milliseconds
FROM Track
WHERE Milliseconds > ALL (SELECT Milliseconds FROM Track WHERE AlbumId = 1);`,
    options: [
      'Tracks longer than every track of album 1, so longer than 343,719 ms',
      'Tracks longer than at least one track of album 1',
      'Tracks longer than the average track of album 1',
      'An error: a subquery after > must return a single value',
    ],
    answer: 0,
    explain: `\`> ALL (...)\` means "greater than every value in the list", which is the same as "greater than the biggest one". So this equals \`Milliseconds > (SELECT MAX(Milliseconds) FROM Track WHERE AlbumId = 1)\`: 706 tracks.

"At least one" is \`> ANY (...)\`, the same as "greater than the *smallest*" (199,836 ms), which gives 2751 tracks. ALL and ANY exist precisely so that a comparison can accept a subquery with many rows, so there's no error here.`,
  },

  // ---------------------------------------------------------------- func
  {
    id: 'q-func-1',
    topic: 'func',
    kind: 'output',
    prompt: `Only 10 of the 59 customers have a Company. What does \`Label\` show for the other 49?`,
    sql: `SELECT CONCAT(FirstName, ' ', LastName, ' (', Company, ')') AS Label
FROM Customer;`,
    options: [
      'Their name followed by " ()"',
      'NULL: in MySQL, CONCAT returns NULL if any part is NULL',
      'Their name followed by " (NULL)"',
      'Nothing: those customers are left out of the result',
    ],
    answer: 1,
    explain: `MySQL's CONCAT is all or nothing: a single NULL argument makes the whole result NULL. You still get 59 rows (a function in SELECT can't remove rows), but 49 of them show NULL.

Fixes:
- \`IFNULL(Company, 'no company')\` inside the CONCAT, to swap the NULL for text.
- \`CONCAT_WS(' ', FirstName, LastName, Company)\`, which skips NULL arguments (handy, but you lose the parentheses).

NULL is not an empty string, so you never get "()" for free.`,
  },
  {
    id: 'q-func-2',
    topic: 'func',
    kind: 'output',
    prompt: `A track lasts 150,000 ms (two and a half minutes). Which Bucket does it get?`,
    sql: `SELECT Name, Milliseconds,
       CASE
         WHEN Milliseconds < 300000 THEN 'medium'
         WHEN Milliseconds < 180000 THEN 'short'
         ELSE 'long'
       END AS Bucket
FROM Track;`,
    runSql: `SELECT CASE
         WHEN Milliseconds < 300000 THEN 'medium'
         WHEN Milliseconds < 180000 THEN 'short'
         ELSE 'long'
       END AS Bucket,
       COUNT(*) AS Tracks
FROM Track
GROUP BY Bucket;`,
    options: ["'short'", "'medium'", "'long'", "Both 'short' and 'medium'"],
    answer: 1,
    explain: `CASE checks its WHENs **top to bottom and stops at the first TRUE one**. 150,000 < 300,000 is true on the first line, so the track is 'medium', and the second WHEN is never even looked at.

In fact no track can ever be 'short': anything under 180,000 is also under 300,000. Run it to see only two buckets (2434 medium, 1069 long). Put the narrowest condition first:

\`\`\`sql
WHEN Milliseconds < 180000 THEN 'short'
WHEN Milliseconds < 300000 THEN 'medium'
ELSE 'long'
\`\`\`

A CASE gives exactly one value per row, never two.`,
  },
  {
    id: 'q-func-3',
    topic: 'func',
    kind: 'rows',
    prompt: `Invoices run from January 2021 to December 2025. How many rows does this return?`,
    sql: `SELECT MONTH(InvoiceDate) AS MonthNo, COUNT(*) AS Invoices
FROM Invoice
GROUP BY MONTH(InvoiceDate);`,
    options: ['5', '60', '412', '12'],
    answer: 3,
    explain: `MONTH() returns just a number from 1 to 12. January 2021 and January 2025 both become 1 and land in the same group: **12** rows, each one mixing five years.

For one row per real calendar month (60 of them), group by year **and** month:

\`\`\`sql
GROUP BY YEAR(InvoiceDate), MONTH(InvoiceDate)
\`\`\`

or by \`DATE_FORMAT(InvoiceDate, '%Y-%m')\`. 5 is what \`GROUP BY YEAR(InvoiceDate)\` gives, and 412 is one row per invoice.`,
  },
  {
    id: 'q-func-4',
    topic: 'func',
    kind: 'pick-query',
    prompt: `Which query returns exactly the invoices from 2024?`,
    optionsSql: true,
    options: [
      `SELECT InvoiceId, InvoiceDate
FROM Invoice
WHERE InvoiceDate LIKE '2024';`,
      `SELECT InvoiceId, InvoiceDate
FROM Invoice
WHERE YEAR(InvoiceDate) = 2024;`,
      `SELECT InvoiceId, InvoiceDate
FROM Invoice
WHERE InvoiceDate >= '2024-01-01';`,
      `SELECT InvoiceId, InvoiceDate
FROM Invoice
WHERE InvoiceDate BETWEEN '2024-01-01' AND '2024-12-01';`,
    ],
    answer: 1,
    reference: `SELECT InvoiceId, InvoiceDate FROM Invoice WHERE InvoiceDate >= '2024-01-01' AND InvoiceDate < '2025-01-01'`,
    explain: `\`YEAR(InvoiceDate) = 2024\` pulls the year out of each date and compares numbers: 83 invoices.

- \`LIKE '2024'\` has no wildcard, so it means "is exactly the text 2024". A date never is: 0 rows. (\`LIKE '2024%'\` would work, but YEAR says what you mean.)
- \`>= '2024-01-01'\` has no upper bound, so 2025 comes along too: 163 rows.
- \`BETWEEN '2024-01-01' AND '2024-12-01'\` stops on the first day of December and loses the rest of the month: 76 rows.

The range \`InvoiceDate >= '2024-01-01' AND InvoiceDate < '2025-01-01'\` is also correct, and it stays correct even when dates carry times.`,
  },
  {
    id: 'q-func-5',
    topic: 'func',
    kind: 'output',
    prompt: `Track 1 lasts 343,719 ms. In MySQL, what are A and B?`,
    sql: `SELECT Milliseconds,
       Milliseconds / 60000   AS A,
       Milliseconds DIV 60000 AS B
FROM Track
WHERE TrackId = 1;`,
    options: ['A = 5 and B = 5', 'A = 6 and B = 5', 'A = 5.7287 and B = 5', 'A = 5.7287 and B = 5.7287'],
    answer: 2,
    explain: `In MySQL, \`/\` **always** gives a decimal, even between two integers: 343719 / 60000 = 5.7287 (MySQL shows 4 decimal places by default; this site prints a few more digits). \`DIV\` is integer division: it throws the fraction away, giving 5.

The tempting "5" comes from languages like Java or C, and from some other databases, where integer / integer truncates. Not in MySQL.

Nothing here rounds: to get 6 you'd need \`ROUND(Milliseconds / 60000)\`, and for a tidy 5.73, \`ROUND(Milliseconds / 60000, 2)\`.`,
  },

  // ---------------------------------------------------------------- set
  {
    id: 'q-set-1',
    topic: 'set',
    kind: 'rows',
    prompt: `Customers live in 24 different countries, and all 8 employees live in Canada. How many rows does this return?`,
    sql: `SELECT Country FROM Customer
UNION
SELECT Country FROM Employee;`,
    options: ['67', '24', '25', '59'],
    answer: 1,
    explain: `**UNION** stacks the two results and then removes duplicate rows, *including* duplicates inside each half. The 59 customer rows shrink to 24 countries, and the employees' Canada is already among them: **24**.

**UNION ALL** keeps everything: 59 + 8 = 67 rows. Use UNION ALL when duplicates are real data (or can't happen), since it skips the duplicate check; use UNION when you want a list of distinct values.`,
  },
  {
    id: 'q-set-2',
    topic: 'set',
    kind: 'bug',
    prompt: `What is wrong with this query?`,
    sql: `SELECT FirstName, LastName FROM Customer
UNION
SELECT FirstName FROM Employee;`,
    broken: true,
    options: [
      'Both SELECTs must return the same number of columns: 2 on top, 1 below',
      'UNION cannot combine rows from two different tables',
      'The column names must be identical on both sides',
      'It should be UNION ALL',
    ],
    answer: 0,
    explain: `UNION glues rows under each other, so every row needs the same shape: the **same number of columns**, matched by position (1st with 1st, 2nd with 2nd). Here the top has 2 and the bottom has 1, so MySQL errors with *The used SELECT statements have a different number of columns*. Add \`LastName\` to the second SELECT.

Combining different tables is the whole point of UNION. Column **names** don't have to match: the result simply takes its names from the first SELECT. And UNION ALL follows the same column rule.`,
  },

  // ---------------------------------------------------------------- dml
  {
    id: 'q-dml-1',
    topic: 'dml',
    kind: 'output',
    prompt: `The plan was to reprice one album. What does this statement actually do?`,
    sql: `UPDATE Track
SET UnitPrice = 1.29;`,
    options: [
      'Error: UPDATE requires a WHERE clause',
      'Changes only the first row of Track',
      'Sets UnitPrice to 1.29 for every track, all 3503 of them',
      'Nothing: with no WHERE there is nothing to match',
    ],
    answer: 2,
    explain: `No WHERE means **no filter**: every row is updated. "3503 rows updated" is the message nobody wants to see. (It's safe to run here: quiz runs are always undone.)

WHERE is optional in UPDATE and DELETE, exactly as in SELECT. MySQL Workbench has a "safe updates" setting that blocks this kind of statement (error 1175), but that's a safety net in the tool, not a rule of SQL.

Good habit: write the SELECT first, check the rows, then turn it into the UPDATE:

\`\`\`sql
SELECT * FROM Track WHERE AlbumId = 1;   -- 10 rows, looks right
UPDATE Track SET UnitPrice = 1.29 WHERE AlbumId = 1;
\`\`\``,
  },
  {
    id: 'q-dml-2',
    topic: 'dml',
    kind: 'output',
    prompt: `AC/DC (ArtistId 1) has 2 albums, and \`Album.ArtistId\` is a foreign key to Artist. In MySQL, what happens?`,
    sql: `DELETE FROM Artist
WHERE ArtistId = 1;`,
    broken: true,
    options: [
      'AC/DC and its 2 albums are deleted',
      'An error: the foreign key blocks deleting an artist that albums still point to',
      'AC/DC is deleted; its albums stay, pointing at an artist that no longer exists',
      'Nothing happens, and no message',
    ],
    answer: 1,
    explain: `A foreign key is a promise: every \`Album.ArtistId\` points to a real artist. Deleting AC/DC would break that promise for 2 albums, so MySQL refuses: *Cannot delete or update a parent row: a foreign key constraint fails* (error 1451). Chinook declares its keys \`ON DELETE NO ACTION\`, which means exactly this: block, don't cascade.

Deleting the albums along with the artist would need \`ON DELETE CASCADE\`, which Chinook doesn't use. Leaving orphan albums is precisely what the constraint exists to prevent. To really remove AC/DC you'd delete bottom-up: the invoice lines and playlist entries of its tracks, then the tracks, then the albums, then the artist.

> Run it: the practice database enforces the foreign keys the same way.`,
  },
];
