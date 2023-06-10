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
- An SSL certificate, if you're following the other entries (specially the [website](https://blog.luevano.xyz/a/website_with_nginx.html) entry), add a `komga.conf` and run `certbot --nginx` (or similar) to extend/create the certificate. More details below: [Reverse proxy](#reverse-proxy) and [SSL certificate](#ssl-certificate).

# AUR - yay

This is the first time I mention the **AUR** (and `yay`) in my entries, so I might as well just write a bit about it.

The [AUR](https://aur.archlinux.org/) is the **A**rch Linux **U**ser **R**epository and it's basically like an extension of the official one which is supported by the community, the only thing is that it requires a different package manager. The one I use (and I think everyone does, too) is `yay`, which as far as I know is like a wrapper of `pacman`.

## Install

To install and use `yay` we need a normal account with sudo access, ==all the commands related to `yay` are run as normal user and then it asks for sudo password==. [Installation](https://github.com/Jguer/yay#installation) its straight forward: clone `yay` repo and install. Only dependencies are `git` and `base-devel`:

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

`yay` is used basically the same as `pacman` with the difference that it is run as normal user (then later requiring sudo password) and that it asks extra input when installing something, such as if we want to build the package from source or if we want to show package diffs.

To install a package (for example Komga in this blog entry), run:

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

Configure it by editing `/etc/komga.conf`:

```conf
SERVER_PORT=8989
SERVER_SERVLET_CONTEXT_PATH=/ # this depends a lot of how it's going to be served (domain, subdomain, ip, etc)

KOMGA_LIBRARIES_SCAN_CRON="0 0 * * * ?"
KOMGA_LIBRARIES_SCAN_STARTUP=false
KOMGA_LIBRARIES_SCAN_DIRECTORY_EXCLUSIONS='#recycle,@eaDir,@Recycle'
KOMGA_FILESYSTEM_SCANNER_FORCE_DIRECTORY_MODIFIED_TIME=false
KOMGA_REMEMBERME_KEY=USE-WHATEVER-YOU-WANT-HERE
KOMGA_REMEMBERME_VALIDITY=2419200

KOMGA_DATABASE_BACKUP_ENABLED=true
KOMGA_DATABASE_BACKUP_STARTUP=true
KOMGA_DATABASE_BACKUP_SCHEDULE="0 0 */8 * * ?"
```

My changes (shown above):

- Port on `8989` because `8080` its too generic.
- `cron` schedules
    - It's not actually `cron` but rather a `cron`-like syntax used by [Spring](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/scheduling/support/CronSequenceGenerator.html) as stated in the [Komga config](https://komga.org/installation/configuration.html#optional-configuration).
- Added the remember me key.
- For more check out [Komga: Configuration options](https://komga.org/installation/configuration.html).

If you're going to run it locally (or LAN/VPN) you can start the `komga.service` and access it via IP at `http://<your-server-ip>:<port>(/base_url)` as stated at [Komga: Accessing the web interface](https://komga.org/installation/webui.html), else continue with the next steps for the reverse proxy and certificate.

## Reverse proxy

Create the reverse proxy configuration (this is for `nginx`). In my case I'll use a subdomain, so this is a new config called `komga.conf` at the usual `sites-available/enabled` path:

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

If it's going to be used as a subdir on another domain then just change the `location` (with `/subdir` instead of `/`) directive to the corresponding `.conf` file; be careful with the `proxy_pass` directive, it has to match what you configured at `/etc/komga.conf` for the `SERVER_SERVLET_CONTEXT_PATH` regardless of the `/subdir` you selected at `location`.

## SSL certificate

If using a subdir then the same certificate for the subdomain/domain should work fine and no extra stuff is needed, else if following along me then we can create/extend the certificate by running:

```sh
certbot --nginx
```

That will automatically detect the new subdomain config and create/extend your existing certificate(s). In my case I manage each certificate's subdomain:

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

Next thing would be to add any extra account (for read-only/download manga permissions), add/import libraries, etc.. For now I'll leave it here until we start downloading manga on the next steps.

## Library creation

Creating a library is as simple as creating a directory somewhere and point to it in Komga. The folowing examples are for my use case, change accordingly. I'll be using `/mnt/d/mangal` for my library:

```sh
mkdir /mnt/d/mangal
```

Where I chose the name `mangal` as its the name of the downloader/scrapper I'm going to use, it could be anything, this is just how I like to organize stuff.

For the most part, the permissions don't matter much (as long as it's readable by the `komga` user) unless you want to delete some manga, then `komga` user also needs write permissions.

Then just create the library in Komga web interface (the `+` sign next to *Libraries*), choose a name *"Mangal"* and point to the root folder `/mnt/d/mangal`, then just click *Next*, *Next* and *Add* for the defaults (that's how I've been using it so far). This is well explained at [Komga: Libraries](https://komga.org/guides/libraries.html).

The real important part (for me) is the permissions of the `/mnt/d/mangal` directory, as I want to have write access for `komga` so I can manage from the web interface itself. It looks like it's just a matter of giving ownership to the `komga` user either for owner or for group (or to all for that matter), but since I'm going to use a separate user to download manga then I need to choose carefully.

### Set default directory permissions

The desired behaviour is: set `komga` as group ownership, set write access to group and whenever a new directory/file is created, inherit these permission settings. I found out via [this](https://unix.stackexchange.com/a/1315) stack exchange answer how to do it. So, for me:

```sh
chown manga-dl:komga /mnt/d/mangal # required for group ownership for komga
chmod g+s /mnt/d/mangal # required for group permission inheritance
setfacl -d -m g::rwx /mnt/d/mangal # default permissions for group
setfacl -d -m o::rx /mnt/d/mangal # default permissions for other (as normal, I think this command can be excluded)
```

Where `manga-dl` is the user I created to download manga with. Optionally add `-R` flag to those 4 commands in case it already has subdirectories/files (this might mess file permissions, but it's not an issue as far as I konw).

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

You can then check by creating a new subdirectory (in `/mnt/d/mangal`) and it should have the same group permissions.

# mangal

[mangal](https://github.com/metafates/mangal) is a cli/tui manga downloader with anilist integration and custom Lua scrapers.

Similar to Komga, you could install it from the AUR with `yay`:

```sh
yay -S mangal-bin
```

But I'll use my [fork](https://github.com/luevano/mangal) as it contains some fixes and extra stuff.

## Install from source

As I mentioned in my past [entry](https://blog.luevano.xyz/a/learned_go_and_lua_hard_way.html) I had to [fork](https://github.com/luevano/mangal) `mangal` and related repositories to fix/change a few things. Currently the major fix I did in `mangal` is for the built in [MangaDex](https://mangadex.org/) scraper which had really annoying bug in the chunking of the manga chapter listing.

So instad of installing with `yay` we'll build it from source. We need to have `go` installed:

```sh
pacman -S go
```

Then clone my fork of `mangal` and build/install it:

```sh
git clone https://github.com/luevano/mangal.git # not sure if you can use SSH to clone
cd mangal
make install # or just `make build` and then move the binary to somewhere in your $PATH
```

This will use `go install` so it will install to a path specified by your environment variables, for more run `go help install`. It was installed to `$HOME/.local/bin/go/mangal` for me, then just make sure this is included in your PATH.

Check it was correctly installed by running `mangal version`, which should print something like:

```
▇▇▇ mangal

  Version         ...
  Git Commit      ...
  Build Date      ...
  Built By        ...
  Platform        ...
```

## Configuration

I'm going to do everything with a normal user (`manga-dl`) which I created just to download manga. So all of the commands will be run without sudo/root privileges.

Change some of the configuration options:

```sh
mangal config set -k downloader.path -v "/mnt/d/mangal" # downloads to current dir by default
mangal config set -k formats.use -v "cbz" # downloads as pdf by default
mangal config set -k installer.user -v "luevano" # points to my scrapers repository which contains a few extra scrapers and fixes, defaults to metafates' one; this is important if you're using my fork, don't use otherwise as it uses extra stuff I added
mangal config set -k logs.write -v true # I like to get logs for what happens
```

For more configs and to read what they're for:

```sh
mangal config info
```

Also install the custom Lua scrapers by running:

```sh
mangal sources install
```

And install whatever you want, it picks up the sources/scrapers from the configured repository (`installer.<key>` config), if you followed, it will show my scrapers.

## Usage

Two main ways of using `mangal`: 

- TUI: for initial browsing/downloading and testing things out. If the manga finished publishing, this should be enough.
- inline: for automation on manga that is still publishing and I need to check/download every once in a while.

### Headless browser

Before continuing, I gotta say I went through some bullshit while trying to use the custom Lua scrapers that use the *headless* browser (actually just a wrapper of [go-rod/rod](https://github.com/go-rod/rod), and honestly it is not really a "headless" browser, `mangal` "documentation" is just wrong). For mor on my rant check out my last [entry](https://blog.luevano.xyz/a/learned_go_and_lua_hard_way.html).

There is no concrete documentation on the "headless" browser, only that it is automatically set up and ready to use... but it doesn't install any library/dependency needed. I discovered the following libraries that were missing on my Arch minimal install:

- library -> arch package containing it
- libnss3.so -> nss
- libatk-1.0.so.0 -> at-spi2-core
- libcups.so.2 -> libcups
- libdrm.so.2 -> libdrm
- libXcomposite.so.1 -> libxcomposite
- libXdamage.so.1 -> libxdamage
- libXrandr.so.2 -> libxrandr
- libgbm.so.1 -> mesa
- libxkbcommon.so.0 -> libxkbcommon
- libpango-1.0.so.0 -> pango
- libasound.so.2 -> alsa-lib

To install them::

```sh
pacman -S nss at-spi2-core libcups libdrm libxcomposite libxdamage libxrandr mesa libxkbcommon pango alsa-lib
```

I can't guarantee that those are all the packages needed, those are the ones I happen to discover (had to [fork](https://github.com/luevano/mangal-lua-libs) the lua libs and add some logging because the error message was too fucking generic).

These dependencies are probably met by installing either `chromedriver` or `google-chrome` from the AUR (for what I could see on the package dependencies).

### TUI

Use the TUI by running

```sh
mangal
```

Download manga using the TUI by selecting the source/scrapper, search the manga/comic you want and then you can select each chapter to download (use `tab` to select all). This is what I use when downloading manga that already finished publishing, or when I'm just searching and testing out how it downloads the manga (directory name, and manga information).

Note that some scrapters will contain duplicated chapters, as they have uploaded chapters from the community. This happens a lot with [MangaDex](https://mangadex.org/).

### Inline

The inline mode is a single terminal command meant to be used to automate stuff or for more advanced options. You can peek a bit into the "[documentation](https://github.com/metafates/mangal/wiki/Inline-mode#command-examples)" which honestly its ass because it doesn't explain much. The minimal command for inline according to the help is:

```sh
mangal inline --manga <option> --query <manga-title>
```

But this will not produce anything because it also needs `--source` (or set the default using the config key `downloader.default_sources`) and either `--json` (for the search result) or `--download` to actually download whatever was found but it could download something you don't want so do the `--json` first.

Something not mentioned anywhere is the `--manga` flag options (found it at the source code), it has 3 available options:

- `first`: first manga entry found for the search.
- `last`: last manga entry found for the search.
- `exact`: exact manga title match. This is the one I use.

That said, I'll do an example by using [Mangapill](https://mangapill.com) as source, and will search for [Demon Slayer: Kimetsu no Yaiba](https://mangapill.com/manga/2285/kimetsu-no-yaiba):

1. Search first and make sure my command will pull the manga I want:

```sh
mangal inline --source "Mangapill" --manga "exact" --query "Kimetsu no Yaiba" --json | jq # I use jq to pretty format the output
```

2. I make sure the json output contains the correct manga information: name, url, etc..
    - You can also include the flag `--include-anilist-manga` to include anilist information (if any) so you can check that the correct anilist id is attached. If the correct one is not attached (and it exists) then you can run the command:

    ```sh
    mangal inline anilist set --name "Kimetsu no Yaiba" --id 101922
    ```

    Which means that all "searches" for that `--name` flag will be attached to that specific anilist ID.
3. If I'm okay with the outputs, then I change `--json` for `--download` to actually download:

```sh
mangal inline --source "Mangapill" --manga "exact" --query "Kimetsu no Yaiba" --download
```

4. Check if the manga is downloaded correctly. I do this by going to my download directory and checking the directory name (I'm picky with this stuff), that all chapters where downloaded, that it includes a correct `series.json` file and it contains a `cover.<img-ext>`; this usually means it correctly pulled information from anilist and that it will contain metadata Komga will be able to use.

### Komga library

Now I just check that it is correctly added to Komga by clicking on the 3 dots to the right of the library name and click on "Scan library files" to refresh if the cron timer hasn't pass by yet.

Then I check that the metadata is correct (once the manga is fully indexed), such as title, summary, chapter count, language, tags, genre, etc., which honestly it never works fine as `mangal` creates the `series.json` with the `comicId` field with an upper case `I` and Komga expects it to be a lower case `i` (`comicid`) so it falls back to using the info from the first chapter. I'll probably will fix this on `mangal` side, and see how it goes.

So, what I do is manually edit the metadata for the manga, by changing whatever it's wrong or add what's missing (I like adding anilist and MyAnimeList links) and then leave it as is.

### Automation

The straight forward approach for automation is just to bundle a bunch of `mangal inline` commands in a shell script and automate either via [cron](https://wiki.archlinux.org/title/cron) or [systemd/Timers](https://wiki.archlinux.org/title/systemd/Timers). But, as always, I overcomplicated/overengineered my approach, which is the following:

1. Group manga names per source.
2. Have a way to track the changes/updates on each run.
3. Use that tracker to know where to start downloading chapters from.
    - This is optional, as you can just do `--chapters "all"` and it will work. This is mostly to keep the logs/output cleaner/shorter.
4. Do any configuration needed beforehand.
5. Download/update each manga using `mangal inline`.
6. Wrap everything in a `systemd` service and timer.

Manga list example:

```sh
mangapill="Berserk|Chainsaw Man|Dandadan|Jujutsu Kaisen|etc..."
```

Bash function that handles the download per manga in the list:

```sh
mangal_src_dl () {
    source_name=$1
    manga_list=$(echo "$2" | tr '|' '\n')

    while IFS= read -r line; do
        # By default download all chapters
        chapters="all"
        last_chapter_n=$(grep -e "$line" "$TRACKER_FILE" | cut -d'|' -f2 | grep -v -e '^$' | tail -n 1)
        if [ -n "${last_chapter_n}" ]; then
            chapters="$last_chapter_n-9999"
            echo "Downloading [${last_chapter_n}-] chapters for $line from $source_name..."
        else
            echo "Downloading all chapters for $line from $source_name..."
        fi
        dl_output=$(mangal inline -S "$source_name" -q "$line" -m "exact" -F "$DOWNLOAD_FORMAT" -c "$chapters" -d)

        if [ $? -ne 0 ]; then
            echo "Failed to download chapters for $line."
            continue
        fi

        line_count=$(echo "$dl_output" | grep -v -e '^$' | wc -l)
        if [ $line_count -gt 0 ]; then
            echo "Downloaded $line_count chapters for $line:"
            echo "$dl_output"
            new_last_chapter_n=$(echo "$dl_output" | tail -n 1 | cut -d'[' -f2 | cut -d']' -f1)
            # manga_name|last_chapter_number|downloaded_chapters_on_this_update|manga_source
            echo "$line|$new_last_chapter_n|$line_count|$source_name" >> $TRACKER_FILE
        else
            echo "No new chapters for $line."
        fi
    done <<< "$manga_list"
}
```

Where `$TRACKER_FILE` is just a variable holding a path to some file where you can store the tracking and `$DOWNLOAD_FORMAT` the format for the mangas, for me it's `cbz`. Then the usage would be something like `mangal_src_dl "Mangapill" "$mangapill"`, meaning that it is a function call per source.

The tracker file would have a format like follows:

```
# Updated: 06/10/23 10:53:15 AM CST
Berserk|0392|392|Mangapill
Dandadan|0110|110|Mangapill
...
```

And note that if you already had manga downloaded and you run the script for the first time, then it will show as if it downloaded everything from the first chapter, but that's just how `mangal` works, it will actually just discover downloaded chapters and only download anything missing.

Any configuration the downloader/updater might need needs to be done before the `mangal_src_dl` calls. I like to configure mangal for download path, format, etc.. To clear the `mangal` cache and `rod` browser (headless browser used in some custom sources) as well as set up any anilist bindings. An example of an anilist binding I had to do is for Mushoku Tensei, as it has both a light novel and manga version, both having different information, for me it was `mangal inline anilist set --name "Mushoku Tensei - Isekai Ittara Honki Dasu" --id 85564`.

Finally is just a matter of using your prefered way of scheduling, I'll use `systemd/Timers` but anything is fine. You could make the downloader script more sophisticated and only running every week on which each manga gets released usually, but that's too much work, so I'll just run it once daily probably, or 2-3 times daily.

## Alternative downloaders

Just for the record, here is a list of downloaders/scrapers I considered before starting to use `mangal`:

- [kaizoku](https://github.com/oae/kaizoku): NodeJS web server that uses `mangal` for its "backend" and honestly since I liked `mangal` so much I should use it, the only reason I don't is because I'm a bitch and I don't want to use a D\*ck\*r image and NodeJS (ew) (in general is pretty bloated in my opinion). If I get tired of my solution with pure `mangal` I might as well just migrate to it as It's a more automatic solution.
- [manga-py](https://github.com/manga-py/manga-py): Python CLI application that's a really good option as far as I've explored it, I'm just not using it yet as `mangal` has been really smooth and has everything I need, but will definitely explore it in the future if I need to. The cool thing out of the box is the amount of sources it can scrape from (somethign lacking from `mangal`).
- [mylar3](https://github.com/mylar3/mylar3): Python web server that should be the easier way to download manga with once correctly set up, but I guess I'm too dumb and don't know how to configure it. Looks like you need to have access to specific private torrent trackers or whatever the other ways to download are, I just couldn't figure out how to set it up and for public torrent stuff everything will be all over the place, so this was no option for me at the end.

Others:

- [HakuNeku](https://hakuneko.download/): It looks pretty easy to use and future rich, only thing is that it's not designed for headless servers, just a normal app. So this is also not an option for me. You could use it on your computer and `rsync` to your server or use some other means to upload to your server (a *nono* for me).
- [FMD](https://github.com/riderkick/FMD): No fucking idea on how to use it and it's not been updated since 2019, just listing it here as an option if it interests you.
