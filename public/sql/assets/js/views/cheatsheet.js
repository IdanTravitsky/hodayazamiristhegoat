import { h, icon, md, highlightSql } from '../ui.js';

const BLOCKS = [
  { t: 'The shape of a query', sql: `SELECT   columns, expressions, aggregates
FROM     table t
JOIN     other o ON o.Id = t.OtherId
WHERE    row conditions
GROUP BY grouping columns
HAVING   group conditions
ORDER BY columns [ASC|DESC]
LIMIT    n;`, md: 'Written in this order. **Executed** in a different one: FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT. That is why an alias from SELECT works in ORDER BY (and in MySQL also in HAVING), but **not** in WHERE.' },
  { t: 'WHERE vs HAVING', md: '- **WHERE** filters rows, *before* grouping. No aggregates allowed.\n- **HAVING** filters groups, *after* grouping. Aggregates welcome.\n- "Customers who spent more than 40" → `GROUP BY c.CustomerId ... HAVING SUM(i.Total) > 40`.' },
  { t: 'Filtering', sql: `WHERE Country IN ('USA', 'Canada')
  AND Milliseconds BETWEEN 180000 AND 240000   -- inclusive
  AND Name LIKE 'The %'        -- % = any text, _ = one char
  AND Composer IS NULL         -- never = NULL
  AND (GenreId = 1 OR GenreId = 3)  -- brackets around OR!`, md: '`AND` binds tighter than `OR`. When in doubt, add parentheses.' },
  { t: 'Aggregates', md: '- `COUNT(*)` counts rows. `COUNT(col)` skips NULLs. `COUNT(DISTINCT col)` counts different values.\n- `SUM`, `AVG`, `MIN`, `MAX` ignore NULLs.\n- `ROUND(AVG(x), 2)` for two decimals.\n- Every plain column in SELECT must be in GROUP BY (MySQL 8 enforces this). The one exception: once you group by a table\'s primary key, that table\'s other columns are allowed.' },
  { t: 'Joins', sql: `-- only matches
FROM Track t JOIN Album al ON al.AlbumId = t.AlbumId
-- keep every left row, NULLs when no match
FROM Artist ar LEFT JOIN Album al ON al.ArtistId = ar.ArtistId
-- "never": left join + IS NULL
WHERE al.AlbumId IS NULL
-- self join
FROM Employee e LEFT JOIN Employee m ON m.EmployeeId = e.ReportsTo`, md: 'A WHERE condition on the right-hand table (anything except `IS NULL`) turns a LEFT JOIN back into an inner one, because unmatched rows have NULL there. Put it in the ON instead if you want to keep the unmatched rows.' },
  { t: 'Subqueries', sql: `-- one value
WHERE Milliseconds > (SELECT AVG(Milliseconds) FROM Track)
-- a list
WHERE TrackId IN (SELECT TrackId FROM InvoiceLine)
-- exists (correlated)
WHERE NOT EXISTS (SELECT 1 FROM Invoice i WHERE i.CustomerId = c.CustomerId)
-- derived table
SELECT AVG(n) FROM (SELECT COUNT(*) AS n FROM Invoice GROUP BY CustomerId) AS x`, md: '`= (subquery)` needs a subquery that returns one value (one row, one column); use `IN` when it can return many. `NOT IN` breaks if the list contains a NULL: prefer `NOT EXISTS`. A derived table needs an alias.' },
  { t: 'Top-N and "the most"', sql: `-- the single longest track
SELECT Name FROM Track ORDER BY Milliseconds DESC LIMIT 1;
-- including ties
SELECT Name FROM Track
WHERE Milliseconds = (SELECT MAX(Milliseconds) FROM Track);`, md: 'LIMIT 1 drops ties. If the question says "all the X with the most Y", compare to a MAX subquery.' },
  { t: 'CASE and NULL helpers', sql: `CASE WHEN Milliseconds < 180000 THEN 'short'
     WHEN Milliseconds < 300000 THEN 'medium'
     ELSE 'long' END AS Length,
IFNULL(Composer, 'Unknown')      -- or COALESCE(a, b, ...)
IF(UnitPrice > 1, 'video', 'song')` },
  { t: 'Text', sql: `CONCAT(FirstName, ' ', LastName)
UPPER(x), LOWER(x), CHAR_LENGTH(x), TRIM(x)
SUBSTRING(x, start, len), LEFT(x, n), RIGHT(x, n)
SUBSTRING_INDEX(Email, '@', -1)   -- the domain
REPLACE(x, 'a', 'b'), LOCATE('sub', x)`, md: 'In MySQL `||` is OR, not concatenation. Always CONCAT.' },
  { t: 'Dates', sql: `YEAR(InvoiceDate), MONTH(InvoiceDate), DAY(InvoiceDate)
DATE_FORMAT(InvoiceDate, '%Y-%m')      -- 2023-04
DATEDIFF('2025-01-01', HireDate)        -- days
TIMESTAMPDIFF(YEAR, BirthDate, HireDate) -- full years
DATE_ADD(InvoiceDate, INTERVAL 30 DAY)
WHERE InvoiceDate >= '2023-01-01' AND InvoiceDate < '2024-01-01'`, md: 'Chinook invoices run from 2021-01-01 to 2025-12-22.' },
  { t: 'UNION', sql: `SELECT FirstName, LastName, 'customer' AS Kind FROM Customer
UNION ALL
SELECT FirstName, LastName, 'employee' FROM Employee
ORDER BY LastName;`, md: 'Same number of columns on both sides. `UNION` removes duplicates, `UNION ALL` keeps them (and is faster). One ORDER BY, at the very end.' },
  { t: 'Changing data', sql: `INSERT INTO Genre (GenreId, Name) VALUES (26, 'K-Pop');
UPDATE Track SET UnitPrice = 1.29 WHERE TrackId = 1;
DELETE FROM PlaylistTrack WHERE PlaylistId = 18;
CREATE VIEW BigInvoices AS SELECT * FROM Invoice WHERE Total > 15;`, md: 'Run the WHERE as a SELECT first. An UPDATE or DELETE without WHERE hits every row.' },
  { t: 'Window functions (bonus)', sql: `SELECT Name, GenreId, Milliseconds,
  RANK() OVER (PARTITION BY GenreId ORDER BY Milliseconds DESC) AS rnk
FROM Track;
-- top 1 per genre: wrap it and filter rnk = 1 outside` },
  { t: 'Chinook in one breath', md: 'Artist → Album → **Track** ← Genre, MediaType · Track ↔ Playlist via PlaylistTrack · Customer → Invoice → InvoiceLine → Track · Customer.SupportRepId → Employee · Employee.ReportsTo → Employee.' },
];

export function renderCheatsheet(main) {
  main.append(
    h('section', { class: 'page-head compact' },
      h('p', { class: 'little-intro' }, h('span', { class: 'tiny-star', html: icon('file') }), 'one page, MySQL flavoured'),
      h('h1', null, 'Cheat sheet', h('span', { class: 'title-dot' }, '.')),
      h('p', { class: 'lead' }, 'Everything on one page. Prints nicely too, if you like paper.'),
      h('button', { class: 'btn small', type: 'button', onclick: () => window.print() }, h('span', { html: icon('file') }), 'Print it')),
    h('div', { class: 'cheats' }, BLOCKS.map(b => h('article', { class: 'cheat' },
      h('h2', null, b.t),
      b.sql ? h('pre', { class: 'code small', html: highlightSql(b.sql) }) : null,
      b.md ? h('div', { class: 'md small', html: md(b.md) }) : null))));
}
