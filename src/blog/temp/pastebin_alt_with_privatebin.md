title: Set up a pastebin alternative with PrivateBin and YOURLS
author: David Luévano
lang: en
summary: How to set up a pastebin alternative with PrivateBin and YOURLS, on Arch.
tags: server
    tools
    code
    tutorial
    english

https://wiki.archlinux.org/title/Arch_package_guidelines
https://wiki.archlinux.org/title/Nginx#PHP_implementation

mariadb (for mysql) is assumed

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

Change the binding address so the service listens on `localhost` by modifying `/etc/my.cnf.d/server.cnf`:

```ini
[mariadb]
bind-address = localhost
```

## Create users/databases

Using `mariadb` as root, create users with their respective database (for our use-case) with the following queries:

```sql
MariaDB> CREATE USER '<username>'@'localhost' IDENTIFIED BY '<password>';
MariaDB> CREATE DATABASE <database_name>;
MariaDB> GRANT ALL PRIVILEGES ON <database_name>.* TO '<username>'@'localhost';
MariaDB> quit
```

The `database_name` will depend on how YOURLS and PrivateBin are configured.

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

Only showing configurations needed, main config file is located at `/etc/php/php.ini`, but drop-in files can be placed at `/etc/php/conf.d/` instead.

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

Create a new user and database as described in [Create users](#Create users).

## Configuration

The default configuration file is self explanatory, it is located at `/etc/webapps/yourls/config.php`.

Set the newly created user/database information and get one cookie string from the [URL provided](http://yourls.org/cookie) (or create your own). Then it is important to change/set the `$yours_user_passwords` variable. I also changed the "shortening method" to `62`:

```php
define( 'YOURLS_URL_CONVERT', 62 );
```

Lastly, the `$yourls_reserved_URL` variable will need more blacklisted words depending on the use-case.

I had issues with the password hashing, which I disabled by adding the following config:

```php
define( 'YOURLS_NO_HASH_PASSWORD', true );
```

## Nginx

Create a `yourls.conf` at the usual `sites-<available/enabled>` path for `nginx`:

### TO-DO ACTUALLY WRITE FOR YOURLS

```nginx
server {
    listen 80;
    root //usr/share/webapps/privatebin/;
    server_name bin.yourdomain.com;

    if ($pastebin_badagent) {
       return 403;
    }

    location / {
        index index.html index.htm index.php;
    }

    include /etc/nginx/php_fastcgi.conf;
}
```

# PrivateBin

https://privatebin.info/
https://github.com/PrivateBin/PrivateBin/blob/master/doc/Installation.md#installation
--- https://github.com/PrivateBin/PrivateBin/blob/master/INSTALL.md#installation
https://github.com/PrivateBin/PrivateBin/wiki/Configuration
https://aur.archlinux.org/packages/privatebin

Install from the AUR with `yay`:

```sh
yay -S privatebin
```

## Configuration

This heavily depends on personal preference. Make a copy of the config template:

```sh
cp /etc/webapps/privatebin/conf.sample.php /etc/webapps/privatebin/conf.php
```

# TO-DO

NEED TO SPECIFY THE DATA PATH CHAGE FROM 'DATA' TO 'VAR/LIB/PRIVATEBIN/

At least configure the `[model]` and `[model_options]` to use SQLite instead of plain filesystem files. 

```sh
[model]
; example of DB configuration for SQLite
class = Database
[model_options]
;dsn = "sqlite:" PATH "data/db.sq3"
dsn = "sqlite:" PATH "/var/lib/privatebin/db.sq3"
usr = null
pwd = null
opt[12] = true  ; PDO::ATTR_PERSISTENT
```


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
    server_name bin.yourdomain.com;

    if ($pastebin_badagent) {
       return 403;
    }

    location / {
        index index.html index.htm index.php;
    }

    include /etc/nginx/php_fastcgi.conf;
}
```
