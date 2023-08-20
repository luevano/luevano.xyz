title: Set up a pastebin alternative with PrivateBin and YOURLS
author: David Luévano
lang: en
summary: How to set up a pastebin alternative with PrivateBin and YOURLS as shortener, on Arch.
tags: server
    tools
    code
    tutorial
    english

I learned about PrivateBin a few weeks back and ever since I've been looking into installing it, along with a URL shortener (a service I wanted to self host since forever). It took me a while as I ran into some problems while experimenting and documenting all the necessary bits in here.

My setup is exposed to the public, and as always is heavily based on previous entries as described in [Prerequisites](#prerequisites). Descriptions on setting up MariaDB (preferred MySQL replacement for Arch) and PHP are written in this entry as this is the first time I've needed them.

Everything here is performed in ==arch btw== and all commands should be run as root unless stated otherwise.

# Table of contents

[TOC]

# Prerequisites

If you want to expose to a (sub)domain, then similar to my early [tutorial](https://blog.luevano.xyz/tag/@tutorial.html) entries (specially the [website](https://blog.luevano.xyz/a/website_with_nginx.html) for the reverse proxy plus certificates):

- `nginx` for the reverse proxy.
- `certbot` for the SSL certificates.
- `yay` to install AUR packages.
    - I briefly mention how to install and use it on [Manga server with Komga: yay](https://blog.luevano.xyz/a/manga_server_with_komga.html#yay).
- An **A** (and/or **AAAA**) or a **CNAME** for `privatebin` and `yourls` (or whatever you want to call them).

# MariaDB

[MariaDB](https://wiki.archlinux.org/title/MariaDB) is a drop-in replacement of [MySQL](https://wiki.archlinux.org/title/MySQL).

Install the `mariadb` package:

```sh
pacman -S mariadb
```

Before starting/enabling the systemd service run:

```sh
mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql
```

`start`/`enable` the `mariadb.service`:

```sh
systemctl start mariadb.service
systemctl enable mariadb.service
```

Run and follow the secure installation script before proceding any further:

```sh
mariadb-secure-installation
```

Change the binding address so the service listens on `localhost` only by modifying `/etc/my.cnf.d/server.cnf`:

```ini
[mariadb]
bind-address = localhost
```

## Create users/databases

To use `mariadb` simply run the command and it will try to login with the corresponding linux user running it. The general login command is:

```sh
mariadb -u <username> -p <database_name>
```

The `database_name` is optional. It will prompt a password input field.

Using `mariadb` as root, create users with their respective database if needed with the following queries:

```sql
MariaDB> CREATE USER '<username>'@'localhost' IDENTIFIED BY '<password>';
MariaDB> CREATE DATABASE <database_name>;
MariaDB> GRANT ALL PRIVILEGES ON <database_name>.* TO '<username>'@'localhost';
MariaDB> quit
```

The `database_name` will depend on how YOURLS and PrivateBin are configured, that is if the services use a separate database and/or table prefixes are used.

# PHP

[PHP](https://wiki.archlinux.org/title/PHP) is a general-purpose scripting language that is usually used for web development, which was supposed to be ass for a long time but it seems to be a misconseption from the *old times*.

Install the `php`, `php-fpm`, `php-gd` packages:

```sh
pacman -S php php-fpm php-gd
```

`start`/`enable` the `php-fpm.service`:

```sh
systemctl start php-fpm.service
systemctl enable php-fpm.service
```

## Configuration

Only showing changes needed, main config file is located at `/etc/php/php.ini`, or drop-in files can be placed at `/etc/php/conf.d/` instead.

Set timezone ([list of timezones](https://www.php.net/manual/en/timezones.php)):

```ini
date.timezone = Europe/Berlin
```

Enable the `gd` and `mysql` extensions:

```ini
extension=gd
extension=pdo_mysql
extension=mysqli
```

## Nginx

Create a PHP specific config that can be reusable at `/etc/nginx/php_fastcgi.conf`:

```nginx
location ~ \.php$ {
    # required for yourls
    add_header Access-Control-Allow-Origin $http_origin;

    # 404
    try_files $fastcgi_script_name =404;

    # default fastcgi_params
    include fastcgi_params;

    # fastcgi settings
    fastcgi_pass                        unix:/run/php-fpm/php-fpm.sock;
    fastcgi_index                       index.php;
    fastcgi_buffers                     8 16k;
    fastcgi_buffer_size         32k;

    # fastcgi params
    fastcgi_param DOCUMENT_ROOT $realpath_root;
    fastcgi_param SCRIPT_FILENAME       $realpath_root$fastcgi_script_name;
    #fastcgi_param PHP_ADMIN_VALUE      "open_basedir=$base/:/usr/lib/php/:/tmp/";
}
```

This then can be imported by any `server` directive that needs it.

# YOURLS

[YOURLS](https://yourls.org/) is a self-hosted URL shortener that is supported by PrivateBin.

Install from the AUR with `yay`:

```sh
yay -S yourls
```

Create a new user and database as described in [MariaDB: Create users/databases](#create-usersdatabases).

## Configuration

The default configuration file is self explanatory, it is located at `/etc/webapps/yourls/config.php`. Make sure to correctly set the user/database YOURLS will use and either create a cookie or get one from [URL provided](http://yourls.org/cookie).

It is important to change the `$yours_user_passwords` variable, YOURLS will hash the passwords on login so it is not stored in plaintext. Password hashing can be disabled with:

```php
define( 'YOURLS_NO_HASH_PASSWORD', true );
```

I also changed the "shortening method" to `62` to include more characters:

```php
define( 'YOURLS_URL_CONVERT', 62 );
```

The `$yourls_reserved_URL` variable will need more blacklisted words depending on the use-case. Make sure the `YOURLS_PRIVATE` variable is set to `true` (default) if the service will be exposed to the public.

## Nginx

Create a `yourls.conf` at the usual `sites-<available/enabled>` path for `nginx`:

```nginx
server {
    listen 80;
    root /usr/share/webapps/yourls/;
    server_name short.example.com;
    index index.php;

    location / {
        try_files $uri $uri/ /yourls-loader.php$is_args$args;
    }

    include /etc/nginx/php_fastcgi.conf;
}
```

Make sure the following header is included in the `php`'s `nginx` location block described in [YOURLS: Nginx](#nginx):

```nginx
add_header Access-Control-Allow-Origin $http_origin;
```

### SSL certificate

Create/extend the certificate by running:

```sh
certbot --nginx
```

Restart the `nginx` service for changes to take effect:

```sh
systemctl restart nginx.service
```

## Usage

The admin area is located at `https://short.example.com/admin/`, login with any of the configured users set with the `$yours_user_passwords` in the config. Activate plugins by going to the "Manage Plugins" page (located at the top left) and clicking in the respective "Activate" button by hovering the "Actin" column, as shown below:

![YOURLS: Activate plugin](${SURL}/images/b/yourls/yourls_activate_plugin.png "YOURLS: Activate plugin")

I personally activated the "Random ShortURLs" and "Allow Hyphens in Short URLs". Once the "Random ShortURLs" plugin is activated it can be configured by going to the "Random ShortURLs Settings" page (located at the top left, right below "Manage Plugins"), only config available is "Random Keyword Length".

The main admin area can be used to manually shorten any link provided, by using the automatic shortening or by providing a custom short URL.

Finally, the "Tools" page (located at the top left) conains the `signature` token, used for [YOURLS: Passwordless API](https://yourls.org/docs/guide/advanced/passwordless-api) as well as useful bookmarklets for URL shortening while browsing.

# PrivateBin

[PrivateBin](https://privatebin.info/) is a minimalist self-hosted alternative to [pastebin](https://pastebin.com/).

Install from the AUR with `yay`:

```sh
yay -S privatebin
```

Create a new user and database as described in [MariaDB: Create users/databases](#create-usersdatabases).

## Configuration

This heavily depends on personal preference, all defaults are fine. Make a copy of the sample config template:

```sh
cp /etc/webapps/privatebin/conf.sample.php /etc/webapps/privatebin/conf.php
```

The most important changes needed are `basepath` according to the `privatebin` URL and the `[model]` and `[model_options]` to use MySQL instead of plain filesystem files:

```php
[model]
; example of DB configuration for MySQL
class = Database
[model_options]
dsn = "mysql:host=localhost;dbname=privatebin;charset=UTF8"
tbl = "privatebin_"     ; table prefix
usr = "privatebin"
pwd = "<password>"
opt[12] = true    ; PDO::ATTR_PERSISTENT
```

Any other `[model]` or `[model_options]` needs to be commented out (for example, the default filesystem setting).

### YOURLS integration

I recommend creating a separate user for `privatebin` in `yourls` by modifying the `$yours_user_passwords` variable in `yourls` config file. Then login with this user and get the `signature` from the "Tools" section in the admin page, for more: [YOURLS: Passwordless API](https://yourls.org/docs/guide/advanced/passwordless-api).

For a "private" `yourls` installation (that needs username/pasword), set `urlshortener`:

```php
urlshortener = "https://short.example.com/yourls-api.php?signature=xxxxxxxxxx&action=shorturl&format=json&url="
```

==Note that this will expose the `signature` in the HTTP requests and anybody with the signature can use it to shorten external URLs.==

## Nginx

To deny access to some bots/crawlers, PrivateBin provides a sample `.htaccess`, which is used in Apache. We need an Nginx version, which I found [here](https://gist.github.com/benediktg/948a70136e2104c8601da7d355061323).

Add the following at the beginning of the `http` block of the `/etc/nginx/nginx.conf` file:

```nginx
http {
    map $http_user_agent $pastebin_badagent {
        ~*bot 1;
        ~*spider 1;
        ~*crawl 1;
        ~https?:// 1;
        WhatsApp 1;
        SkypeUriPreview 1;
        facebookexternalhit 1;
	}

    #...
}
```

Create a `privatebin.conf` at the usual `sites-<available/enabled>` path for `nginx`:

```nginx
server {
    listen 80;
    root //usr/share/webapps/privatebin/;
    server_name bin.example.com;
    index index.php;

    if ($pastebin_badagent) {
       return 403;
    }

    location / {
        try_files $uri $uri/ /index.php$is_args$args;
    }

    include /etc/nginx/php_fastcgi.conf;
}
```

### SSL certificate

Create/extend the certificate by running:

```sh
certbot --nginx
```

Restart the `nginx` service for changes to take effect:

```sh
systemctl restart nginx.service
```

