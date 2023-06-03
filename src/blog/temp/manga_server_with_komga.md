title: Set up a manga server with Komga and mangal
author: David Luévano
lang: en
summary: How to set up a manga server with Komga as media server and mangal for downloading manga, on Arch. Tachiyomi integration is available thanks to Komga.
tags: server
	tools
	code
	tutorial
	english

I've been wanting to set up a manga media server to hoard some mangas/comics and access them via Tachiyomi, but I didn't have enough space in my vultr VPS. Now that I have symmetric fiber optic at home and my spare PC to use as a server I decided to go ahead and create one. As always, ==i use arch btw== so these instructions are specifically for it, I'm not sure how easier/harder it is for other distros, I'm just too comfortable with arch honestly.

I'm going to run it as an exposed service using a subdomain of my own, so the steps are taking that into account, if you want to run it locally (or on a LAN/VPN) then it is going to be easier/with less steps (you're on your own). Also, as you might notice I don't like to use D\*ck\*r images or anything (ew).

As always, all commands are run as root unless stated otherwise.

# Table of contents

[TOC]

# Prerequisites

Similar to my early [tutorial](https://blog.luevano.xyz/tag/@tutorial.html) entries, if you want it as a subdomain:

- An **A** (and/or **AAAA**) or a **CNAME** for `komga` (or whatever you want).
- An SSL certificate, if you're following the other entries (specially the [website](https://blog.luevano.xyz/a/website_with_nginx.html) entry), add a `komga.conf` and run `certbot --nginx` (or similar) to extend/create the certificate. More details below.

# AUR - yay

This is the first time I mention the **AUR** (and `yay`) in my blogs, so I might as well just write a bit about it.

The [AUR](https://aur.archlinux.org/) is the **A**rch Linux **U**ser **R**epository and it's basically like an extension of the official one which is supported by the community, the only thing is that it requires a different package manager, which as far as I know is like a wrapper of `pacman`. The one I use (and I think everyone) is `yay`.

## Install

To install and use `yay` we need a normal account with sudo access, **all the commands related to `yay` are run as normal user and then it asks for sudo password**. [Installation](https://github.com/Jguer/yay#installation) its straight forward: clone `yay` repo and install. Only dependencies are `git` and `base-devel`:

Install dependencies:

```sh
sudo pacman -S git base-devel
```

Clone `yay` and install it (I also like to delete the cloned git repo):

```sh
git clone git@github.com:Jguer/yay.git
cd yay
makepkg -si
cd ..
sudo rm -r yay
```

## Usage

`yay` is used basically the same as `pacman` with the difference that it is run as normal user (then later requiring sudo password) and that it asks extra input when installing something, such as if we want to build the package or if we want to show package diffs.

To install a package (for example Komga in this blog entry):

```sh
yay -S komga
```

# Komga

[Komga](https://komga.org/) is a comics/mangas media server.

Install from the AUR:

```sh
yay -S komga
```

This `komga` package creates a `komga` (service) user and group which is tied to the also included `komga.service`.

Before starting to use the service we can configure it by editing `/etc/komga.conf`:

```conf
SERVER_PORT=8989
SERVER_SERVLET_CONTEXT_PATH=/ # note that this needs to be changed if it's going to be served on a subdir (example.com/subdir), for subdomain (komga.example.com) leave as is

KOMGA_LIBRARIES_SCAN_CRON="0 0 * * * ?"
KOMGA_LIBRARIES_SCAN_STARTUP=false
KOMGA_LIBRARIES_SCAN_DIRECTORY_EXCLUSIONS='#recycle,@eaDir,@Recycle'
KOMGA_FILESYSTEM_SCANNER_FORCE_DIRECTORY_MODIFIED_TIME=false
KOMGA_REMEMBERME_KEY=USE-WHATEVER-YOU-WANT-HERE-I-GENERATED-ONE-MYSELF
KOMGA_REMEMBERME_VALIDITY=2419200

KOMGA_DATABASE_BACKUP_ENABLED=true
KOMGA_DATABASE_BACKUP_STARTUP=true
KOMGA_DATABASE_BACKUP_SCHEDULE="0 0 */8 * * ?"
```

I changed the port to `8989` because `8080` its too generic, modified the `cron` schedules (not actually `cron`, its a `cron`-like syntax used by [Spring cron expression](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/scheduling/support/CronSequenceGenerator.html) as stated in the [Komga config](https://komga.org/installation/configuration.html#optional-configuration)) and added the remember me key. For mor check out [Komga: Configuration options](https://komga.org/installation/configuration.html).

If you're going to run it locally (or LAN/VPN) you can start the `komga.service` and access it via IP at `http://<your-server/ip>:<port>(/base_url)` as stated at [Komga: Accessing the web interface](https://komga.org/installation/webui.html), else continue with the next steps for the reverse proxy and certificate.

## Reverse proxy

Before starting/enabling the `komga.service` create the reverse proxy configuration (this is for `nginx`). In my case I'll use a subdomain, so this is a new config called `komga.conf` at the usual `sites-available/enabled` dir:

```nginx
server {
    listen 80;
    server_name komga.yourdomain.com; # change accordingly to your wanted subdomain and domain name

    location / {
        proxy_pass http://localhost:8989; # change 8989 to the port you want to use

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

If it's going to be used as a subdir then just add the same `location` (with `/subdir` instead of `/`) directive to the corresponding `.conf` file, be careful with the `proxy_pass` directive, it has to match what you configured at `/etc/komga.conf` regardless of the `/subdir` you selected at `location`.

## SSL certificate

If using a subdir then the same certificate for the subdomain/domain should work fine and no extra stuff is needed, else if following along me then we can create/extend the certificate by running:

```sh
certbot --nginx
```

That will automatically detect the new subdomain config and create/extend your existing certificate(s). In my case I manage each certificate's subdomain, so for me I run something along the lines of:

```sh
certbot --nginx -d domainname.com -d subdomain.domainname.com -d komga.domainname.com
```

## Starting using Komga

We can now `start`/`enable` the `komga.service`:

```sh
systemctl enable komga.service
systemctl start komga.service
```

And access the web interface at `https://komga.domainname.com` which should show the login page for Komga. The first time it will ask to create an account as shown in [Komga: Create user account](https://komga.org/installation/webui.html#create-user-account), this will be an admin account. Fill in the email and password (can be changed later). The email doesn't have to be an actual email, for now it's just for management purposes.

Next thing would be to add any extra account (for read-only permissions), add/import libraries, etc.. For now I'll leave it here until we start downloading manga on the next steps.

## Library creation

Creating a library is as simple as creating a directory somewhere (in my case I use a mounted drive) and point to it in Komga.

Change the directory name(s) and user/group name(s) accordingly. For me:

```sh
mkdir /mnt/d/mangal
```

Where I chose the name `mangal` as its the name of the downloader/scrapper I'm going to use. For the most part, the permissions don't matter much (as long as it's readable by the `komga` user) unless you want to delete some manga.

Then just create the library in Komga (the `+` sign next to *Libraries*), choose a name (*Mangal* in my case) and point to the root folder (`/mnt/d/mangal` in my case), then just click *Next*, *Next* and *Add* for the defaults (that's how I've been using it so far). This is well explained at [Komga: Libraries](https://komga.org/guides/libraries.html).

The real important part (for me) is the permissions of the `/mnt/d/mangal` directory (and for any future directory for extra libraries for the matter), as I want to have write access for `komga` so I can manage from the web interface itself. It looks like it's just a matter of giving ownership to the `komga` user either for owner or for group (or to all for that matter), but since I'm going to use a separate user to download manga then I need to choose carefully.

### Set default directory permissions

The desired behaviour is: set `komga` as group ownership, set write access to group and whenever a new directory/file is created, inherit these permission settings. I found out via [this](https://unix.stackexchange.com/a/1315) stack exchange answer how to do it. So for me:

```sh
chown manga-dl:komga /mnt/d/mangal # required for group ownership for komga
chmod g+s /mnt/d/mangal # required for group permission inheritance
setfacl -d -m g::rwx /mnt/d/mangal # default permissions for group
setfacl -d -m o::rx /mnt/d/mangal # default permissions for other (as normal, I think this command can be excluded)
```

Where `manga-dl` is the user I created to download manga with. Optionally add `-R` flag to those 4 commands in case it already has subdirectories/files.

Checking that the permissions are set correctly (`getfacl /mnt/d/mangal`):

```
getfacl: Removing leading '/' from absolute path names
# file: mnt/d/mangal
# owner: manga-dl
# group: komga
# flags: -s-
user::rwx
group::rwx
other::r-x
default:user::rwx
default:group::rwx
default:other::r-x
```

You can then check by creating a new subdirectory and it should have the same permissions (except for owner if you used some other user to create it).

# Download manga

This is the most important part I think as it can be either very tedious or really simple. Some clients that could be used to download manga:

- [mangal](https://github.com/metafates/mangal): Go CLI (and TUI) that's been the best option so far for me. You can either use the TUI for interactive manga searching and downloading (on an actual computer you can even read from there I guess) that also can be used to automate via scripts with its *inline* option. This is what I've been using and what I'm going to describe later in this entry. Only bad thing about it is the out-of-the-box scrapers it contains (only 4 + 2 working custom), the good thing is that it is easy to create new scrapers with its Lua support.
- [kaizoku](https://github.com/oae/kaizoku): NodeJS web server that uses `mangal` for its "backend" and honestly since I liked `mangal` so much I should use it, the only reason I don't is because I'm a bitch and I don't want to use a D\*ck\*r image and NodeJS (ew) (in general is pretty bloated in my opinion). If I get tired of my solution with pure `mangal` I might as well just migrate to it as It's a more automatic solution.
- [manga-py](https://github.com/manga-py/manga-py): Python CLI application that's a really good option as far as I've explored it, I'm just not using it yet as `mangal` has been really smooth and has everything I need, but will definitely explore it in the future if I need to. The cool thing out of the box is the amount of sources it can scrape from (somethign lacking from `mangal`).
- [mylar3](https://github.com/mylar3/mylar3): Python web server that should be the easier way to download manga with once correctly set up, but I guess I'm too dumb and don't know how to configure it. Looks like you need to have access to specific private torrent trackers or whatever the other ways to download are, I just couldn't figure out how to set it up and for public torrent stuff everything will be all over the place, so this was no option for me at the end.

Others:

- [HakuNeku](https://hakuneko.download/): It looks pretty easy to use and future rich, only thing is that it's not designed for headless servers, just a normal app. So this is also not an option for me. You could use it on your computer and `rsync` to your server or use some other means to upload to your server (a *nono* for me).
- [FMD](https://github.com/riderkick/FMD): No fucking idea on how to use it and it's not been updated since 2019, just listing it here as an option if it interests you.

## mangal

[mangal](https://github.com/metafates/mangal) is a cli/tui manga downloader with anilist integration and custom Lua scrapers.

Similar to Komga, install it from the AUR with `yay`:

```sh
yay -S mangal-bin
```

I'm going to do everything with a normal user (`manga-dl`) I created just to download manga. So all of the commands will be run without sudo/root privileges.

Change some of the configuration options (if you want):

```sh
mangal config set -k downloader.path -v "/mnt/d/mangal" # downloads to current dir by default
mangal config set -k formats.use -v "cbz" # downloads as pdf by default
mangal config set -k installer.user -v "luevano" # points to my scrapers repository which contains a few extra scrapers and fixes, defaults to metafates' one
mangal config set -k logs.write -v true # I like to get logs for what happens
```

For more configs and to read what they're for:

```sh
mangal config info
```

With this we can already start using `mangal` to download via the TUI or the *inline* option.

### Headless browser scrapper

BULLSHIT STUFF HERE

### TUI

Run the TUI by just running:

```sh
mangal
```

It will start a fancy TUI where you can select the source/scrapper to use, search the manga/comic you want and download it (and/or read it if using on a normal computer). This is the way I use it when downloading manga that already finished publishing, or when I'm just searching and testing out how it downloads the manga (directory name, and manga information).