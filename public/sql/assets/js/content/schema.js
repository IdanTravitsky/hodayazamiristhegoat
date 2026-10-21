// Hand-written guide to the Chinook tables. Facts checked against the data (v1.4.5).

export const STORY = `Chinook is a pretend digital music store, a bit like early iTunes. **Artists** make **albums**, albums hold **tracks**, every track has a **genre** and a **media type** (file format). Tracks can also sit on **playlists**.

On the business side, **customers** buy tracks. Each purchase is an **invoice** (the receipt), and each line on that receipt is an **invoice line** (one track bought). Every customer has a support rep, who is an **employee**, and employees report to other employees.`;

export const TABLES = {
  Artist: {
    blurb: 'The musicians and bands. Just an id and a name.',
    sakila: 'actor (sort of)',
    cols: { Name: 'Artist or band name. Careful: Track, Genre, MediaType and Playlist also have a column called Name.' },
    facts: ['275 artists, but only 204 have an album. The other 71 are good LEFT JOIN practice.'],
  },
  Album: {
    blurb: 'Albums. Each belongs to exactly one artist.',
    sakila: '(no direct cousin)',
    cols: { Title: 'Album title. Not to be confused with Employee.Title, which is a job title.', ArtistId: 'Who made it. Links to Artist.ArtistId.' },
    facts: ['347 albums. One artist can have many albums (one to many).'],
  },
  Track: {
    blurb: 'The songs (and some TV episodes and videos). The center of the whole database.',
    sakila: 'film',
    cols: {
      Name: 'Track title.',
      AlbumId: 'Which album it is on. Links to Album.',
      MediaTypeId: 'File format. Links to MediaType.',
      GenreId: 'Links to Genre.',
      Composer: 'Who wrote it. NULL for 977 tracks, so COUNT(Composer) is less than COUNT(*).',
      Milliseconds: 'Length. Divide by 60000 for minutes, by 1000 for seconds.',
      Bytes: 'File size in bytes. Divide by 1048576 for MB.',
      UnitPrice: 'List price: 0.99 for songs, 1.99 for videos.',
    },
    facts: ['3,503 tracks. 1,519 of them were never bought (no InvoiceLine points at them).', 'Like Sakila\'s film: the thing everything else revolves around.'],
  },
  Genre: {
    blurb: '25 genres, like Rock, Jazz, Metal.',
    sakila: 'category',
    cols: { Name: 'Genre name. Join it in when a question says "per genre".' },
    facts: ['Rock is by far the biggest genre (1,297 tracks).'],
  },
  MediaType: {
    blurb: 'Five file formats, like "MPEG audio file" or "Protected MPEG-4 video file".',
    sakila: 'language (similar idea: a small lookup table)',
    cols: { Name: 'Format name. "Protected MPEG-4 video file" = the videos.' },
    facts: ['Most tracks (3,034) are MPEG audio files.'],
  },
  Playlist: {
    blurb: 'Named playlists. Some names repeat (two "Music", two "Movies"...).',
    sakila: '(no direct cousin)',
    cols: { Name: 'Playlist name. Not unique, so group by PlaylistId, not by Name alone.' },
    facts: ['18 playlists, 4 of them are empty (Movies, Audiobooks and their twins).'],
  },
  PlaylistTrack: {
    blurb: 'The bridge between playlists and tracks. One row = "this track is on this playlist".',
    sakila: 'film_actor / film_category (bridge tables)',
    cols: { PlaylistId: 'Part of the primary key. Links to Playlist.', TrackId: 'Part of the primary key. Links to Track.' },
    facts: ['A many-to-many relationship: a track can be on many playlists and a playlist has many tracks.', 'The primary key is the pair (PlaylistId, TrackId).'],
  },
  Employee: {
    blurb: 'Eight staff members. Some are support reps for customers. They report to each other.',
    sakila: 'staff',
    cols: {
      Title: 'Job title (General Manager, Sales Support Agent...).',
      ReportsTo: 'The EmployeeId of their manager. NULL for the boss, Andrew Adams. Join Employee to itself to get the manager\'s name.',
      BirthDate: 'DATETIME. YEAR(BirthDate) works.',
      HireDate: 'DATETIME.',
    },
    facts: ['Only the three Sales Support Agents (ids 3, 4, 5) have customers.', 'ReportsTo makes this a self-referencing table: the classic self join.'],
  },
  Customer: {
    blurb: '59 customers from 24 countries.',
    sakila: 'customer',
    cols: {
      Company: 'Mostly NULL (49 of 59). Only business customers have one.',
      State: 'NULL for 29 customers (countries without states).',
      Fax: 'Mostly NULL.',
      SupportRepId: 'Their support rep. Links to Employee.EmployeeId (not to a column called EmployeeId in Customer: there is none).',
    },
    facts: ['USA has the most customers (13).'],
  },
  Invoice: {
    blurb: 'One row per purchase (the receipt). Has the date, billing address and total.',
    sakila: 'payment / rental',
    cols: {
      CustomerId: 'Who bought. Links to Customer.',
      InvoiceDate: 'DATETIME, from 2021-01-01 to 2025-12-22. All times are midnight (shown here without the 00:00:00). Use YEAR(InvoiceDate) or a date range.',
      BillingCountry: 'Billing address. Here it always matches the customer\'s own country, but it is a separate column.',
      Total: 'Sum of its lines. Revenue questions: SUM(Total).',
    },
    facts: ['412 invoices, about 83 per year. Totals range from 0.99 to 25.86.'],
  },
  InvoiceLine: {
    blurb: 'The lines of an invoice. One row = one track bought on one invoice.',
    sakila: 'rental (one item rented)',
    cols: {
      InvoiceId: 'Which invoice. Links to Invoice.',
      TrackId: 'Which track. Links to Track. Your bridge from money to music.',
      UnitPrice: 'The price paid on this line. Here it equals Track.UnitPrice, but it is the one to use for sales.',
      Quantity: 'Always 1 in this data, but write UnitPrice * Quantity anyway, it is the correct habit.',
    },
    facts: ['2,240 lines. To get from a sale to an artist: InvoiceLine → Track → Album → Artist.'],
  },
};

export const SAKILA = [
  ['film', 'Track', 'The main "product". Film had length in minutes, Track has Milliseconds.'],
  ['actor', 'Artist', 'People attached to the product, via Album instead of a bridge table.'],
  ['category', 'Genre', 'But each track has exactly one GenreId (no bridge table).'],
  ['film_category / film_actor', 'PlaylistTrack', 'The many-to-many bridge table.'],
  ['language', 'MediaType', 'A small lookup table referenced by the product.'],
  ['customer', 'Customer', 'Customer.SupportRepId → Employee (Sakila had store_id).'],
  ['staff', 'Employee', 'Plus a ReportsTo column for the org chart.'],
  ['payment', 'Invoice', 'Money: Invoice.Total, dated InvoiceDate.'],
  ['rental', 'InvoiceLine', 'One item per row, pointing at the product (TrackId).'],
  ['inventory, store, address, city, country', '(none)', 'Addresses are plain columns inside Customer, Employee and Invoice.'],
];

export const GOTCHAS = [
  { t: 'Five tables have a column called Name', d: 'Track, Artist, Genre, MediaType and Playlist. When you join them, always write `t.Name`, `ar.Name`... and give them aliases in the SELECT (`ar.Name AS Artist`).' },
  { t: 'Two different Titles', d: '`Album.Title` is an album name, `Employee.Title` is a job title.' },
  { t: 'Two prices', d: '`Track.UnitPrice` is the list price. `InvoiceLine.UnitPrice` is what was actually paid. For "sales" or "revenue", use InvoiceLine (or Invoice.Total).' },
  { t: 'Getting from money to music', d: 'Invoice → InvoiceLine → Track → Album → Artist. Revenue per artist needs all of them (Invoice is optional if you use InvoiceLine prices).' },
  { t: 'Support rep, not EmployeeId', d: 'Customers point to employees through `Customer.SupportRepId = Employee.EmployeeId`.' },
  { t: 'The self join', d: '`Employee.ReportsTo` holds another EmployeeId. To show each employee with their manager: `FROM Employee e LEFT JOIN Employee m ON e.ReportsTo = m.EmployeeId` (LEFT so the boss stays).' },
  { t: 'NULLs that matter', d: 'Composer (977 NULL), Customer.Company (49 NULL), State (29 NULL), Fax, ReportsTo (1 NULL). `= NULL` never matches; use `IS NULL`.' },
  { t: 'Dates are DATETIME', d: "In MySQL, InvoiceDate looks like `2023-04-05 00:00:00` (every time is midnight, so this site just shows `2023-04-05`). Use `YEAR(InvoiceDate) = 2023`, or `InvoiceDate >= '2023-01-01' AND InvoiceDate < '2024-01-01'`." },
  { t: 'Milliseconds', d: 'Track length is in milliseconds. Minutes = `Milliseconds / 60000`. "Longer than 5 minutes" = `Milliseconds > 300000`.' },
  { t: 'Things that never happened', d: '71 artists have no album, 1,519 tracks were never sold, 4 playlists are empty. "Never" questions want `LEFT JOIN ... WHERE x IS NULL` or `NOT EXISTS`.' },
];

export const JOIN_PATHS = [
  { q: 'Track with its album, artist, genre', sql: `SELECT t.Name AS Track, al.Title AS Album, ar.Name AS Artist, g.Name AS Genre
FROM Track t
JOIN Album al ON al.AlbumId = t.AlbumId
JOIN Artist ar ON ar.ArtistId = al.ArtistId
JOIN Genre g ON g.GenreId = t.GenreId
LIMIT 10;` },
  { q: 'What did each customer buy', sql: `SELECT c.FirstName, c.LastName, i.InvoiceDate, t.Name AS Track
FROM Customer c
JOIN Invoice i ON i.CustomerId = c.CustomerId
JOIN InvoiceLine il ON il.InvoiceId = i.InvoiceId
JOIN Track t ON t.TrackId = il.TrackId
LIMIT 10;` },
  { q: 'Customer with their support rep', sql: `SELECT c.FirstName, c.LastName, e.FirstName AS RepFirst, e.LastName AS RepLast
FROM Customer c
JOIN Employee e ON e.EmployeeId = c.SupportRepId
LIMIT 10;` },
  { q: 'Employee with their manager', sql: `SELECT e.FirstName, e.LastName, m.FirstName AS ManagerFirst, m.LastName AS ManagerLast
FROM Employee e
LEFT JOIN Employee m ON m.EmployeeId = e.ReportsTo;` },
  { q: 'Tracks on a playlist', sql: `SELECT p.Name AS Playlist, t.Name AS Track
FROM Playlist p
JOIN PlaylistTrack pt ON pt.PlaylistId = p.PlaylistId
JOIN Track t ON t.TrackId = pt.TrackId
WHERE p.Name = 'Grunge';` },
];

// ERD layout: x, y and which columns to draw (the rest are summarized as "+ n more").
export const LAYOUT = {
  Artist: { x: 16, y: 20, show: ['ArtistId', 'Name'] },
  Album: { x: 226, y: 20, show: ['AlbumId', 'Title', 'ArtistId'] },
  Track: { x: 436, y: 20, show: ['TrackId', 'Name', 'AlbumId', 'MediaTypeId', 'GenreId', 'Composer', 'Milliseconds', 'Bytes', 'UnitPrice'] },
  MediaType: { x: 646, y: 20, show: ['MediaTypeId', 'Name'] },
  Genre: { x: 646, y: 120, show: ['GenreId', 'Name'] },
  Employee: { x: 856, y: 20, show: ['EmployeeId', 'FirstName', 'LastName', 'Title', 'ReportsTo', 'BirthDate', 'HireDate', 'City'] },
  Playlist: { x: 16, y: 300, show: ['PlaylistId', 'Name'] },
  PlaylistTrack: { x: 226, y: 300, show: ['PlaylistId', 'TrackId'] },
  InvoiceLine: { x: 436, y: 300, show: ['InvoiceLineId', 'InvoiceId', 'TrackId', 'UnitPrice', 'Quantity'] },
  Invoice: { x: 646, y: 300, show: ['InvoiceId', 'CustomerId', 'InvoiceDate', 'BillingCity', 'BillingCountry', 'Total'] },
  Customer: { x: 856, y: 300, show: ['CustomerId', 'FirstName', 'LastName', 'Company', 'City', 'Country', 'Email', 'SupportRepId'] },
};
