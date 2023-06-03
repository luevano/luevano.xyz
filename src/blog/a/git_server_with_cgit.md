title: Set up a Git server and cgit front-end
author: David Luévano
lang: en
summary: How to create a Git server using cgit on a server running Nginx, on Arch. This is a follow up on post about creating a website with Nginx and Certbot.
tags: server
	tools
	code
	tutorial
	english

My git server is all I need to setup to actually *kill* my other server (I've been moving from servers on these last 2-3 blog entries), that's why I'm already doing this entry. I'm basically following [git's guide on setting up a server](https://git-scm.com/book/en/v2/Git-on-the-Server-Setting-Up-the-Server) plus some specific stuff for ==btw i use== Arch Linux ([Arch Linux Wiki: Git server](https://wiki.archlinux.org/index.php/Git_server#Web_interfaces) and [Step by step guide on setting up git server in arch linux (pushable)](https://miracoin.wordpress.com/2014/11/25/step-by-step-guide-on-setting-up-git-server-in-arch-linux-pushable/)).

Note that this is mostly for personal use, so there's no user/authentication control other than that of normal `ssh`. And as with the other entries, most if not all commands here are run as root unless stated otherwise.

# Table of contents

[TOC]

# Prerequisites

I might get tired of saying this (it's just copy paste, basically)... but you will need the same prerequisites as before (check my [website](https://blog.luevano.xyz/a/website_with_nginx.html) and [mail](https://blog.luevano.xyz/a/mail_server_with_postfix.html) entries), with the extras:

- (Optional, if you want a "front-end") A **CNAME** for "git" and (optionally) "www.git", or some other name for your sub-domains.
- An SSL certificate, if you're following the other entries, add a `git.conf` and run `certbot --nginx` to extend the certificate.

# Git

[Git](https://wiki.archlinux.org/title/git) is a version control system.

If not installed already, install the `git` package:

```sh
pacman -S git
```

On Arch Linux, when you install the `git` package, a `git` user is automatically created, so all you have to do is decide where you want to store the repositories, for me, I like them to be on `/home/git` like if `git` was a "normal" user. So, create the `git` folder (with corresponding permissions) under `/home` and set the `git` user's home to `/home/git`:

```sh
mkdir /home/git
chown git:git /home/git
usermod -d /home/git git
```

Also, the `git` user is "expired" by default and will be locked (needs a password), change that with:

```sh
chage -E -1 git
passwd git
```

Give it a strong one and remember to use `PasswordAuthentication no` for `ssh` (as you should). Create the `.ssh/authorized_keys` for the `git` user and set the permissions accordingly:

```sh
mkdir /home/git/.ssh
chmod 700 /home/git/.ssh
touch /home/git/.ssh/authorized_keys
chmod 600 /home/git/.ssh/authorized_keys
chown -R git:git /home/git
```

Now is a good idea to copy over your local SSH public keys to this file, to be able to push/pull to the repositories. Do it by either manually copying it or using `ssh`'s built in `ssh-copy-id` (for that you may want to check your `ssh` configuration in case you don't let people access your server with user/password).

Next, and almost finally, we need to edit the `git-daemon` service, located at `/usr/lib/systemd/system/` (called `git-daemon@.service`):

```ini
...
ExecStart=-/usr/lib/git-core/git-daemon --inetd --export-all --base-path=/home/git --enable=receive-pack
...
```

I just appended `--enable=receive-pack` and note that I also changed the `--base-path` to reflect where I want to serve my repositories from (has to match what you set when changing `git` user's home).

Now, go ahead and start and enable the `git-daemon` socket:

```sh
systemctl start git-daemon.socket
systemctl enable git-daemon.socket
```

You're basically done. Now you should be able to push/pull repositories to your server... except, you haven't created any repository in your server, that's right, they're not created automatically when trying to push. To do so, you have to run (while inside `/home/git`):

```sh
git init --bare {repo_name}.git
chown -R git:git {repo_name}.git
```

==Those two lines above will need to be run each time you want to add a new repository to your server==. There are options to "automate" this but I like it this way.

After that you can already push/pull to your repository. I have my repositories (locally) set up so I can push to more than one remote at the same time (my server, GitHub, GitLab, etc.); to do so, check [this gist](https://gist.github.com/rvl/c3f156e117e22a25f242).

# Cgit

[Cgit](https://wiki.archlinux.org/title/Cgit) is a fast web interface for git.

This is optionally since it's only for the web application.

Install the `cgit` and `fcgiwrap` packages:

```sh
pacman -S cgit fcgiwrap
```

Now, just start and enable the `fcgiwrap` socket:

```sh
systemctl start fcgiwrap.socket
systemctl enable fcgiwrap.socket
```

Next, create the `git.conf` as stated in my [nginx setup entry](https://blog.luevano.xyz/a/website_with_nginx.html). Add the following lines to your `git.conf` file:

```nginx
server {
	listen 80;
	listen [::]:80;
	root /usr/share/webapps/cgit;
	server_name {yoursubdomain}.{yourdomain};
	try_files $uri @cgit;

	location @cgit {
		include fastcgi_params;
		fastcgi_param SCRIPT_FILENAME $document_root/cgit.cgi;
		fastcgi_param PATH_INFO $uri;
		fastcgi_param QUERY_STRING $args;
		fastcgi_param HTTP_HOST $server_name;
		fastcgi_pass unix:/run/fcgiwrap.sock;
	}
}
```

Where the `server_name` line depends on you, I have mine setup to `git.luevano.xyz` and `www.git.luevano.xyz`. Optionally run `certbot --nginx` to get a certificate for those domains if you don't have already.

Now, all that's left is to configure `cgit`. Create the configuration file `/etc/cgitrc` with the following content (my personal options, pretty much the default):

```apache
css=/cgit.css
logo=/cgit.png

enable-http-clone=1
# robots=noindex, nofollow
virtual-root=/

repo.url={url}
repo.path={dir_path}
repo.owner={owner}
repo.desc={short_description}
...
```

Where you can uncomment the `robots` line to not let web crawlers (like Google's) to index your `git` web app. And at the end keep all your repositories (the ones you want to make public), for example for my [*dotfiles*](https://git.luevano.xyz/.dots) I have:

```apache
...
repo.url=.dots
repo.path=/home/git/.dots.git
repo.owner=luevano
repo.desc=These are my personal dotfiles.
...
```

Otherwise you could let `cgit` to automatically detect your repositories (you have to be careful if you want to keep "private" repos) using the option `scan-path` and setup `.git/description` for each repository. For more, you can check [cgitrc(5)](https://man.archlinux.org/man/cgitrc.5).

## Cgit's file rendering

By default you can't see the files on the site, you need a highlighter to render the files, I use `highlight`. Install the `highlight` package:

```sh
pacman -S highlight
```

Copy the `syntax-highlighting.sh` script to the corresponding location (basically adding `-edited` to the file):

```sh
cp /usr/lib/cgit/filters/syntax-highlighting.sh /usr/lib/cgit/filters/syntax-highlighting-edited.sh
```

And edit it to use the version 3 and add `--inline-css` for more options without editing `cgit`'s CSS file:

```sh
...
# This is for version 2
# exec highlight --force -f -I -X -S "$EXTENSION" 2>/dev/null

# This is for version 3
exec highlight --force --inline-css -f -I -O xhtml -S "$EXTENSION" 2>/dev/null
...
```

Finally, enable the filter in `/etc/cgitrc` configuration:

```apache
source-filter=/usr/lib/cgit/filters/syntax-highlighting-edited.sh
```

That would be everything. If you need support for more stuff like compressed snapshots or support for markdown, check the optional dependencies for `cgit`.
