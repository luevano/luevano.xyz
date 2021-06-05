title: SQL tutorial video notes
author: David Luévano
lang: en
summary: Notes of videos about basic SQL syntax and usage, as requested by a mentor of mine.
tags: notes
	english

I was requested to make summaries of videos about SQL, these are the notes (mostly this is a transcription of what I found useful). The videos in question are: [SQL Tutorial - Full Database Course for Beginners](https://www.youtube.com/watch?v=HXV3zeQKqGY), [MySQL Tutorial for Beginners [Full Course]](https://www.youtube.com/watch?v=7S_tz1z_5bA) and [Advanced SQL course | SQL tutorial advanced](https://www.youtube.com/watch?v=2Fn0WAyZV0E). Also, some notes were taken from [w3schools.com's SQL Tutorial](https://www.w3schools.com/sql/) and [MySQL 8.0 Reference Manual](https://dev.mysql.com/doc/refman/8.0/en/).

## What is a database (DB)?

Any collection of related information, such as a phone book, a shopping list, Facebook's user base, etc.. It can be stored in different ways: on paper, on a computer, in your mind, etc..

### Database Management Systems (DBMS)

A special software program that helps users create and maintain a database that makes it easy to manage large amounts of information, handles security, backups and can connect to programming languages for automation.

### CRUD

The four main operations that a DBMS will do: create, read, update and delete.

### Two types of databases

* Relational (SQL)
	* Organize data into one or more tables.
	* Each table has columns and rows.
	* A unique key identifies each row.
* Non-relational (noSQL/not just SQL)
	* Key-value stores.
	* Documents (JSON, XML, etc).
	* Graphs.
	* Flexible tables.

#### Relational databases (RDB) (SQL)

When we want to create a RDB we need a Relational Database Management System (RDBMS) that uses Structured Query Language (SQL) which is a standardized language for interacting with RDBMS and it's used to perform CRUD operations (and other administrative tasks).

#### Non-relational databases (NRDB) (noSQL/not just SQL)

Anything that's not relational, stores data in anything but static tables. Could be a document (JSON, XML, etc.), graph (relational nodes), key-value hash (strings, json, etc.), etc.

NRDB also require a Non-Relational Database Management System (NRDBMS) to maintain a database. But it doesn't have a standardized language for performing CRUD and administrative operations like how RDB have.

### Database queries

A DB query is a request that is made to the (R/NR)DBMS for a specific information. A google search is a query, for example.

## Tables and keys

A table is composed of columns, rows and a primary key. The primary key is unique and identifies one specific row. Columns and rows are trivial, a column identifies a field and has a specific data type (name, email, birth) and a row identifies a table entry (person that contains a name, email and birth).

Also, there are foreign keys, it's purpose is to relate to another database table; this foreign key is unique in it's own table, but can be repeated where you use it as a foreign key.

It's possible to use the same table keys as foreign keys to make relations inside the same table.

## SQL basics

It's actually a hybrid language, basically 4 types of languages in one:

* Data Query Language (DQL)
	* Used to query the database for information.
	* Get information that is already stored there.
* Data Definition Language (DDL)
	* Used for defining database schemas.
* Data Control Language (DCL)
	* Used for controlling access to the data in the database.
	* User and permissions management.
* Data Manipulation Language (DML)
	* Used for inserting, updating and deleting data from a database.

### Queries

A set of instructions given to the RDBMS (written in SQL) that tell the RDBMS what information you want it to retrieve. Instead of getting the whole database, retrieve only a bit of information that you need.

Also, SQL keywords can be either lower or upper case, but it's **convention to use upper case**. And **queries are ended by a semi-colon**.

#### Data types

Just some SQL data types (for more: [MySQL 8.0 Reference Manual: Chapter 11 Data Types](https://dev.mysql.com/doc/refman/8.0/en/data-types.html), the notation is `DATATYPE(SIZE(,SIZE))`:

* `INT`: integer numbers.
* `DECIMAL(M,N)`: decimal numbers.
* `VARCHAR(N)`: string of text of length N.
* `BLOB`: Binary Large Object, stores large data.
* `DATE`: YYYY-MM-DD.
* `TIMESTAMP`: YYYY-MM-DD HH:MM:SS.

#### Basic management of tables

To **create a table**, the basic syntax is `CREATE TABLE tablename (column1 datatype constraint, column2 datatype constraint, ...)`, where a constraint could be (for more: [MySQL 8.0 Reference Manual: 13.1.20 CREATE TABLE Statement](https://dev.mysql.com/doc/refman/8.0/en/create-table.html)):

* `NOT NULL`: can't have a `NULL` value.
* `UNIQUE`: all values are unique.
* `PRIMARY KEY`: uniquely identifies each row.
* `FOREIGN KEY`: uniquely identifies a row in another table.
* `CHECK expresion`: satisfy a special condition (`expresion`).
* `DEFAULT value`: if no value is specified use value `value`.
* `INDEX`: to create and retrieve data from the database very quickly.

Get the **table structure** with `DESCRIBE tablename` and delete it with `DROP TABLE tablename`. **Add columns** to the table with `ALTER TABLE tablename ADD column DATATYPE(N,M)`, similar syntax to **delete a specific column** `ALTER TABLE tablename DRORP COLUMN column`.

**Add entries** to the table with `INSERT INTO tablename VALUES(value1, value2, ...)` where all the fields must be specified, or `INSERT INTO tablename(column1, column2) VALUES(value1, value2)` to just add some fields to the new entry. While at it, (all) the table content can be fetched with `SELECT * FROM tablename`.

Basic **Updating of entries** with `UPDATE tablename SET expression1 WHERE expression2`, where `expression1` could be `column = value2` and `expression2` could be `column = value1`, meaning that the value of `column` will be changed from `value1` to `value2`. Note that the expressions are not limited by `column = value`, and that the `column` has to be the same, it would be any expression. Also, this is really extensive as `SET` can set multiple variables and `WHERE` take more than one condition by chaining conditions with `AND`, `OR` and `NOT` keywords, for example.

##### ON DELETE statement

When an entry needs to be updated somehow based on a modification on a foreign key. If two tables are related to each other, if something is deleted on one end, update the other end in some way.

For example on creation of a table, on the specification of a foreign key: `CREATE TABLE tablename (..., FOREIGN KEY(column) REFERENCES othertable(othertablecolumn) ON DELETE something)`. That something could be `SET NULL`, `CASCADE`, etc..

#### SELECT queries

Instead of doing `SELECT * FROM tablename`, which gets all the data from a table, more complex `SELECT` queries can be implemented, such as `SELECT column FROM tablename` to only get all data from one column of the table. Append `LIMIT N` to limit the query to `N` entries. Append `WHERE condition` to meet a custom condition.

Other statements that can be used in conjunction with `SELECT` are `ORDER BY column ASC|DESC`, `SELECT DISTINCT`, `MIN(column)`, `MAX(column)`, `COUNT(column)`, `AVG(column)`, `SUM(column)`, `LIKE` and more. For more, visit [MySQL 8.0 Reference Manual: 13.2.10 SELECT Statement](https://dev.mysql.com/doc/refman/8.0/en/select.html).

MySQL uses regular expressions (regex) like pattern matching, some wildcards that can be used with the `LIKE` statement are:

* `%`: zero or more characters.
* `_`: a single character.
* `[]`: any single character within the brackets.
* `^`: any character not in the brackets.
* `-`: a range of characters.

An extended regex can be used with the statement `REGEX_LIKE(expression)`; `REGEXP` and `RLIKE` are synonyms for `REGEX_LIKE`. For more: [MySQL 8.0 Reference Manual: 3.3.4.7 Pattern Matching](https://dev.mysql.com/doc/refman/8.0/en/pattern-matching.html).

#### Unions

A specialized SQL operator that is used to combine multiple `SELECT` statements into one. The basic syntax is `SELECT ... UNION SELECT ...`, where `...` is a whole `SELECT` statement; there can be any amount of unions. There are some rules that apply when doing unions, such as having the same amount of columns on both statements and being of the same data type.

#### Joins

Used to combine rows from two or more tables based on a related column between them. Basic syntax is `SELECT table1.column1, ..., table2.column1, ... FROM table(1|2) JOIN table(1|2) ON table1.common_column = table2.common_column`, where the table specified in the `FROM` statement is called the "left" table, where the one in the `JOIN` statement is the "right" table. For more: [MySQL 8.0 Reference Manual: 13.2.10.2 JOIN Clause](https://dev.mysql.com/doc/refman/8.0/en/join.html).

There are different types of SQL JOINs:

* `(INNER) JOIN`: returns records that have matching values in both tables.
* `LEFT (OUTER) JOIN`: returns all records from the left table, and the matched records from the right table.
* `RIGHT (OUTER) JOIN`: returns all records from the right table, and the matched records from the left table.
* `FULL (OUTER) JOIN`: returns all records when there is a match in either left or right table.

![INNER JOIN](https://static.luevano.xyz/images/b/notes/sql/img_innerjoin.gif)
![LEFT JOIN](https://static.luevano.xyz/images/b/notes/sql/img_leftjoin.gif)
![RIGHT JOIN](https://static.luevano.xyz/images/b/notes/sql/img_rightjoin.gif)
![FULL OUTER JOIN](https://static.luevano.xyz/images/b/notes/sql/img_fulljoin.gif)

#### Nested queries

A query composed of multiple select statements to get a specific piece of information. This is self explanatory, you do a `SELECT` query somewhere inside another one, for example `SELECT ... IN (SELECT ...)`, where the nesting is occurring inside the parenthesis after the `IN` statement.

A nesting isn't constrained to the `IN` statement, it can appear anywhere, for example in a `WHERE` statement: `SELECT ... WHERE something = (SELECT ...)`.

#### Triggers

A block of SQL code that will define a certain action that will happen when a specific operation is performed on the database. It is **recommended to change the `DELIMITER` temporarily from semi-colon to something else** (since we need to use semi-colon to end the trigger) while the trigger is created. The basic syntax is `CREATE TRIGGER trigername triggertime triggerevent ON tablename FOR EACH ROW triggerorder triggerbody`. For more: [MySQL 8.0 Reference Manual: 13.1.22 CREATE TRIGGER Statement](https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html) and [MySQL 8.0 Reference Manual: 25.3.1 Trigger Syntax and Examples](https://dev.mysql.com/doc/refman/8.0/en/trigger-syntax.html).

#### Entity Relationship Diagrams (ERD)

When designing a database it's important to define a **database schema** which is just a definition of all the different tables and their attributes that are going to live inside the database. So, basically, an ERD diagram is a diagram that consists of text, symbols and shapes that are combined to create a relationship model.

The diagram consists of:

* **Entity**: a square with the name of the entity inside it.
* **Attributes**: ovals with the name of the attributes inside it; an attribute defines specific pieces of information about an entity (columns).
* **Primary key**: same as with attributes but with name underlined; the primary key uniquely identifies the entity.
* **Composite attribute**: an attribute that consists on one or more (sub-)attributes.
* **Multi-valued attribute**: oval with another oval inside it and the name of the attribute.
* **Derived attribute**: dotted oval; this attribute can be derived from other attributes from the entity.
* **Relationship**: a diamond with the relationship name in it, for the connections a single line (partial participation) or a doubled line (total participation); it denotes how two or more attributes are related to each other; all members must participate in the relationship.
* **Relationship attribute**: denoted like a normal attribute, but it's child of a relationship; it defines what attributes exists because of the relationship, it's not stored in any of the entities related, but on the relationship object itself.
* **Relationship cardinality**: denoted with a number on the line connecting the relationship to the entity; detones the number of instances of an entity from a relation that can be associated with the relation.
* **Weak entity**: rectangle inside a rectangle with its name inside; it cannot be uniquely identified by its attributes alone.
* **Weak entity's primary key**: oval with its text underlined, but the line is dotted.
* **Identifying relationship**: a diamond inside a diamond with its name inside; a relationship that serves to uniquely identify the weak entity.

![ERD example taken from wikipedia](https://static.luevano.xyz/images/b/notes/sql/erd_example.png)
