title: Create a website with Nginx and Certbot
author: David Luévano
lang: en
summary: How to create website that runs on Nginx and uses Certbot for SSL certificates. This is a base for future blog posts about similar topics.
tags: server
	tools
	code
	tutorial
	english

These are general notes on how to setup a Nginx web server plus Certbot for SSL certificates, initially learned from [Luke's video](https://www.youtube.com/watch?v=OWAqilIVNgE) and after some use and research I added more stuff to the mix. And, actually at the time of writing this entry, I'm configuring the web server again on a new VPS instance, so this is going to be fresh.

As a side note, ==i use arch btw== so everything here es aimed at an Arch Linux distro, and I'm doing everything on a VPS. Also note that most if not all commands here are executed with root privileges.

# Table of contents

[TOC]

# Prerequisites

You will need two things:

- A domain name (duh!). I got mine on [Epik](https://www.epik.com/?affid=da5ne9ru4) (affiliate link, btw).
	- With the corresponding **A** and **AAA** records pointing to the VPS' IPs. I have three records for each type: empty string, "www" and "\*" for a wildcard, that way "domain.name", "www.domain.name", "anythingelse.domain.name" point to the same VPS (meaning that you can have several VPS for different sub-domains). These depend on the VPS provider.
- A VPS or somewhere else to host it. I'm using [Vultr](https://www.vultr.com/?ref=8732849) (also an affiliate link, btw).
	- With `ssh` already configured both on the local machine and on the remote machine.
	- Firewall already configured to allow ports `80` (HTTP) and `443` (HTTPS). I use `ufw` so it's just a matter of doing `ufw allow 80,443/tcp` (for example) as root and you're golden.
	- `cron` installed if you follow along (you could use `systemd` timers, or some other method you prefer to automate running commands every certain time).

# Nginx

[Nginx](https://wiki.archlinux.org/title/Nginx) is a web (HTTP) server and reverse proxy server.

You have two options: `nginx` and `nginx-mainline`. I prefer `nginx-mainline` because it's the "up to date" package even though `nginx` is labeled to be the "stable" version. Install the package and enable/start the service:

```sh
pacman -S nginx-mainline
systemctl enable nginx.service
systemctl start nginx.service
```

And that's it, at this point you can already look at the default initial page of Nginx if you enter the IP of your server in a web browser. You should see something like this:

![Nginx welcome page](${SURL}/images/b/notes/nginx/nginx_welcome_page.png "Nginx welcome page")

As stated in the welcome page, configuration is needed, head to the directory of Nginx:

```sh
cd /etc/nginx
```

Here you have several files, the important one is `nginx.conf`, which as its name implies, contains general configuration of the web server. If you peek into the file, you will see that it contains around 120 lines, most of which are commented out and contains the welcome page server block. While you can configure a website in this file, it's common practice to do it on a separate file (so you can scale really easily if needed for mor websites or sub-domains).

Inside the `nginx.conf` file, delete the `server` blocks and add the lines `include sites-enabled/*;` (to look into individual server configuration files) and `types_hash_max_size 4096;` (to get rid of an ugly warning that will keep appearing) somewhere inside the `http` block. The final `nginx.conf` file would look something like (ignoring the comments just for clarity, but you can keep them as side notes):

```nginx
worker_processes 1;

events {
	worker_connections 1024;
}

http {
	include sites-enabled/*;
	include mime.types;
	default_type application/octet-stream;

	sendfile on;

	keepalive_timeout 65;

	types_hash_max_size 4096;
}
```

Next, inside the directory `/etc/nginx/` create the `sites-available` and `sites-enabled` directories, and go into the `sites-available` one:

```sh
mkdir sites-available
mkdir sites-enabled
cd sites-available
```

Here, create a new `.conf` file for your website and add the following lines (this is just the sample content more or less):

```nginx
server {
	listen 80;
	listen [::]:80;

	root /path/to/root/directory;
	server_name domain.name another.domain.name;
	index index.html anotherindex.otherextension;

	location /{
		try_files $uri $uri/ =404;
	}
}
```

That could serve as a template if you intend to add more domains.

Note some things:

- `listen`: we're telling Nginx which port to listen to (IPv4 and IPv6, respectively).
- `root`: the root directory of where the website files (`.html`, `.css`, `.js`, etc. files) are located. I followed Luke's directory path `/var/www/some_folder`.
- `server_name`: the actual domain to "listen" to (for my website it is: `server_name luevano.xyz www.luevano.xyz;` and for this blog is: `server_name blog.luevano.xyz www.blog.luevano.xyz;`).
- `index`: what file to serve as the index (could be any `.html`, `.htm`, `.php`, etc. file) when just entering the website.
- `location`: what goes after `domain.name`, used in case of different configurations depending on the URL paths (deny access on `/private`, make a proxy on `/proxy`, etc).
	- `try_files`: tells what files to look for.

Then, make a symbolic link from this configuration file to the `sites-enabled` directory:

```sh
ln -s /etc/nginx/sites-available/your_config_file.conf /etc/nginx/sites-enabled
```

This is so the `nginx.conf` file can look up the newly created server configuration. With this method of having each server configuration file separate you can easily "deactivate" any website by just deleting the symbolic link in `sites-enabled` and you're good, or just add new configuration files and keep everything nice and tidy.

All you have to do now is restart (or enable and start if you haven't already) the Nginx service (and optionally test the configuration):

```sh
nginx -t
systemctl restart nginx
```

If everything goes correctly, you can now go to your website by typing `domain.name` on a web browser. But you will see a "404 Not Found" page like the following (maybe with different Nginx version):

![Nginx 404 Not Found page](${SURL}/images/b/notes/nginx/nginx_404_page.png "Nginx 404 Not Found page")

That's no problem, because it means that the web server it's actually working. Just add an `index.html` file with something simple to see it in action (in the `/var/www/some_folder` that you decided upon). If you keep seeing the 404 page make sure your `root` line is correct and that the directory/index file exists.

I like to remove the `.html` and trailing `/` on the URLs of my website, for that you need to add the following `rewrite` lines and modify the `try_files` line (for more: [Sean C. Davis: Remove HTML Extension And Trailing Slash In Nginx Config](https://www.seancdavis.com/blog/remove-html-extension-and-trailing-slash-in-nginx-config/)):

```nginx
server {
	...
	rewrite ^(/.*)\.html(\?.*)?$ $1$2 permanent;
	rewrite ^/(.*)/$ /$1 permanent;
	...
	try_files $uri/index.html $uri.html $uri/ $uri =404;
	...
```

# Certbot

[Certbot](https://wiki.archlinux.org/title/Certbot) is what provides the SSL certificates via [Let's Encrypt](https://letsencrypt.org/).

The only "bad" (bloated) thing about Certbot, is that it uses `python`, but for me it doesn't matter too much. You may want to look up another alternative if you prefer. Install the packages `certbot` and `certbot-nginx`:

```sh
pacman -S certbot certbot-nginx
```

After that, all you have to do now is run `certbot` and follow the instructions given by the tool:

```sh
certbot --nginx
```

It will ask you for some information, for you to accept some agreements and the names to activate HTTPS for. Also, you will want to "say yes" to the redirection from HTTP to HTTPS. And that's it, you can now go to your website and see that you have HTTPS active.

Now, the certificate given by `certbot` expires every 3 months or something like that, so you want to renew this certificate every once in a while. I did this before using `cron` or manually creating a `systemd` timer and service, but now it's just a matter of enabling the `certbot-renew.timer`:

```sh
systemctl start certbot-renew.timer
```

The `deploy-hook` is not needed anymore, only for plugins. For more, visit the [Arch Linux Wiki](https://wiki.archlinux.org/title/Certbot#Automatic_renewal).
