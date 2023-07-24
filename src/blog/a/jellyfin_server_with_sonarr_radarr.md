title: Set up a media server with Jellyfin, Sonarr and Radarr
author: David Luévano
lang: en
summary: How to set up a media server with Jellyfin, Sonarr and Radarr, on Arch. With Bazarr, too.
tags: server
	tools
	code
	tutorial
	english

Second part of my self hosted media server. This is a direct continuation of [Set up qBitTorrent with Jackett for use with Starr apps](https://blog.luevano.xyz/a/torrenting_with_qbittorrent.html), which will be mentioned as "first part" going forward. Sonarr, Radarr, Bazarr (Starr apps) and Jellyfin setups will be described in this part. Same introduction applies to this entry, regarding the use of documentation and configuration.

Everything here is performed in ==arch btw== and all commands should be run as root unless stated otherwise.

==Kindly note that I do not condone the use of BitTorrent for illegal activities. I take no responsibility for what you do when setting up anything shown here. It is for you to check your local laws before using automated downloaders such as Sonarr and Radarr.==

# Table of contents

[TOC]

# Prerequisites

Same prerequisites as with the [First part: Prerequisites](https://blog.luevano.xyz/a/torrenting_with_qbittorrent.html#prerequisites) plus:

- An **A** (and/or **AAAA**) or a **CNAME** for `jellyfin`. Only if you want to expose Jellyfin to a subdomain.

The [First part: Directory structure](https://blog.luevano.xyz/a/torrenting_with_qbittorrent.html#directory-structure) is the same here. The `servarr` user and group should be available, too.

==It is assumed that the first part was followed.==

# Radarr

[Radarr](https://radarr.video/) is a movie collection manager that can be used to download movies via torrents. This is actually a fork of Sonarr, so they're pretty similar, I just wanted to set up movies first.

Install from the AUR with `yay`:

```sh
yay -S radarr
```

==Add the `radarr` user to the `servarr` group:==

```sh
gpasswd -a radarr servarr
```

The default port that Radarr uses is `7878` for http (the one you need for the reverse proxy).

## Reverse proxy

Add the following `location` blocks into the `isos.conf` with whatever subdirectory name you want, I'll leave it as `radarr`:

```nginx
location /radarr/ {
    proxy_pass http://127.0.0.1:7878/radarr/; # change port if needed
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $http_connection;

    proxy_redirect off;
}
# Allow the API External Access via NGINX
location /radarr/api {
    auth_basic off;
    proxy_pass http://127.0.0.1:7878/radarr/api; # change port if needed
}
```

This is taken from [Radarr Nginx reverse proxy configuration](https://wiki.servarr.com/radarr/installation#nginx). Restart the `nginx` service for the changes to take effect:

```sh
systemctl restart nginx.service
```

## Start using Radarr

You can now `start`/`enable` the `radarr.service`:

```sh
systemctl enable radarr.service
systemctl start radarr.service
```

This will start the service and create the default configs under `/var/lib/radarr`. You need to change the `URLBase` as the reverse proxy is under a subdirectory (`/radarr`). Edit `/var/lib/radarr/config.xml`:

```xml
...
<UrlBase>/radarr</UrlBase>
...
```

Then restart the `radarr` service:

```sh
systemctl restart radarr.service
```

Now `https://isos.yourdomain.com/radarr` is accessible. ==Secure the instance right away== by adding authentication under *Settings -> General -> Security*. I added the "Forms" option, just fill in the username and password then click on save changes on the top left of the page. You can restart the service again and check that it asks for login credentials.

Note that if you want to have an anime movies library, it is recommended to run a second instance of Radarr for this as shown in [Radarr: Linux multiple instances](https://wiki.servarr.com/radarr/installation#linux-multiple-instances) and follow [TRaSH: How to setup quality profiles anime](https://trash-guides.info/Radarr/radarr-setup-quality-profiles-anime/) if an anime instance is what you want.

### Configuration

Will be following the official [Radarr: Quick start guide](https://wiki.servarr.com/radarr/quick-start-guide) as well as the recommendations by [TRaSH: Radarr](https://trash-guides.info/Radarr/).

Anything that is not mentioned in either guide or that is specific to how I'm setting up stuff will be stated below.

#### Media Management

- **File Management**:
    - *Propers and Repacks*: set it to "Do Not Prefer" and instead you'll use the [Repack/Proper](https://trash-guides.info/Radarr/Radarr-collection-of-custom-formats/#repackproper) [custom format by TRaSH](https://trash-guides.info/Radarr/Radarr-collection-of-custom-formats).

#### Quality

This is personal preference and it dictates your preferred file sizes. You can follow [TRaSH: Quality settings](https://trash-guides.info/Radarr/Radarr-Quality-Settings-File-Size/) to maximize the quality of the downloaded content and restrict low quality stuff.

Personally, I think TRaSH's quality settings are a bit elitist and first world-y. I'm fine with whatever and the tracker I'm using has the quality I want anyways. I did, however, set it to a minimum of `0` and maximum of `400` for the qualities shown in TRaSH's guide. Configuring anything below `720p` shouldn't be necessary anyways.

#### Custom Formats

Again, this is also completely a personal preference selection and depends on the quality and filters you want. My custom format selections are mostly based on [TRaSH: HD Bluray + WEB quality profile](https://trash-guides.info/Radarr/radarr-setup-quality-profiles/#hd-bluray-webA).

The only *Unwanted* format that I'm not going to use is the Low Quality ([LQ](https://trash-guides.info/Radarr/Radarr-collection-of-custom-formats/#lq)) as it blocks one of the sources I'm using to download a bunch of movies. The reasoning behind the LQ custom format is that these release groups don't care much about quality (they keep low file sizes) and name tagging, which I understand but I'm fine with this as I can upgrade movies individually whenever I want (I want a big catalog of content that I can quickly watch).

#### Profiles

As mentioned in [Custom Formats](#custom-formats) and [Quality](#quality) this is completly a personal preference. I'm going to go for "Low Quality" downloads by still following some of the conventions from TRaSH. I'm using the [TRaSH: HD Bluray + WEB quality profile](https://trash-guides.info/Radarr/radarr-setup-quality-profiles/#hd-bluray-webA) with the exclusion of the [LQ](https://trash-guides.info/Radarr/Radarr-collection-of-custom-formats/#lq) profile.

I set the name to "HD Bluray + WEB". I'm also not upgrading the torrents for now. Language set to "Original".

#### Download clients

Pretty straight forward, just click on the giant "+" button and click on the qBitTorrent option. Then configure:

- Name: can be anything, just an identifier.
- Enable: enable it.
- Host: use `127.0.0.1`. For some reason I can't make it work with the reverse proxied qBitTorrent.
- Port: the port number you chose, `30000` in my case.
- Url Base: leave blank as even though you have it exposed under `/qbt`, the service itself is not.
- Username: the Web UI username, `admin` by default.
- Password: the Web UI username, `adminadmin` by default (you should've changed it if you have the service exposed).
- Category: `movies`.

Everything else can be left as default, but maybe change *Completed Download Handling* if you'd like. Same goes for the general *Failed Download Handling* download clients' option.

#### Indexers

Also easy to set up, also just click on the giant "+" button and click on the *custom* Torznab option (you can also use the *preset -> Jackett* Torznab option). Then configure:

- Name: can be anything, just an identifier. I like to do "Jackett - INDEXER", where "INDEXER" is just an identifier.
- URL: `http://127.0.0.1:9117/jack/api/v2.0/indexers/YOURINDEXER/results/torznab/`, where `YOURINDEXER` is specific to each indexer (`yts`, `nyaasi`, etc.). Can be directly copied from the indexer's "Copy Torznab Feed" button on the Jackett Web UI.
- API Path: `/api`, leave as is.
- API Key: this can be found at the top right corner in Jackett's Web UI.
- Categories: which categories to use when searching, these are generic categories until you test/add the indexer. After you add the indexer you can come back and select your prefered categories (like just toggling the movies categories).
- Tags: I like to add a tag for the indexer name like `yts` or `nyaa`. This is useful to control which indexers to use when adding new movies.

Everything else on default. *Download Client* can also be set, which can be useful to keep different categories per indexer or something similar. *Seed Ratio* and *Seed Time* can also be set and are used to manage when to stop the torrent, this can also be set globally on the qBitTorrent Web UI, this is a personal setting.

### Download content

You can now start to download content by going to *Movies -> Add New*. Basically just follow the [Radarr: How to add a movie](https://wiki.servarr.com/radarr/quick-start-guide#how-to-add-a-movie) guide. The screenshots from the guide are a bit outdated but it contains everything you need to know.

I personally use:

- Monitor: Movie Only.
- Minimum Availability: Released.
- Quiality Profile: "HD Bluray + WEB", the one configured in this entry.
- Tags: the indexer name I want to use to download the movie, usually just `yts` for me (remember this is a "LQ" release group, so if you have that custom format disable it) as mentioned in [Indexers](#indexers). If you don't specify a tag it will only use indexers that don't have a tag set.
- Start search for missing movie: toggled on. Immediatly start searching for the movie and start the download.

Once you click on "Add Movie" it will add it to the *Movies* section and start searching and selecting the best torrent it finds, according to the "filters" (quality settings, profile and indexer(s)).

When it selects a torrent it sends it to qBitTorrent and you can even go ahead and monitor it over there. Else you can also monitor at *Activity -> Queue*.

After the movie is downloaded and processed by Radarr, it will create the appropriate hardlinks to the `media/movies` directory, as set in [First part: Directory structure](https://blog.luevano.xyz/a/torrenting_with_qbittorrent.html#directory-structure).

Optionally, you can add subtitles using [Bazarr](#bazarr).

# Sonarr

[Sonarr](https://sonarr.tv/) is a TV series collection manager that can be used to download series via torrents. Most of the install process, configuration and whatnot is going to be basically the same as with Radarr.

Install from the AUR with `yay`:

```sh
yay -S sonarr
```

==Add the `sonarr` user to the `servarr` group:==

```sh
gpasswd -a sonarr servarr
```

The default port that Radarr uses is `8989` for http (the one you need for the reverse proxy).

## Reverse proxy

Basically the same as with [Radarr: Reverse proxy](#reverse-proxy), ==except that the `proxy_set_header` changes from `$proxy_host` to `$host`.==

Add the following `location` blocks into the `isos.conf`, I'll leave it as `sonarr`:

```nginx
location /sonarr/ {
    proxy_pass http://127.0.0.1:8989/sonarr/; # change port if needed
    proxy_http_version 1.1;

    proxy_set_header Host $proxy_host; # this differs from the radarr reverse proxy
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $http_connection;

    proxy_redirect off;
}
# Allow the API External Access via NGINX
location /sonarr/api {
    auth_basic off;
    proxy_pass http://127.0.0.1:8989/sonarr/api; # change port if needed
}
```

This is taken from [Sonarr: Nginx reverse proxy configuration](https://wiki.servarr.com/sonarr/installation#nginx). Restart the `nginx` service for the changes to take effect:

```sh
systemctl restart nginx.service
```

## Start using Sonarr

You can now `start`/`enable` the `sonarr.service`:

```sh
systemctl enable sonarr.service
systemctl start sonarr.service
```

This will start the service and create the default configs under `/var/lib/sonarr`. You need to change the `URLBase` as the reverse proxy is under a subdirectory (`/sonarr`). Edit `/var/lib/sonarr/config.xml`:

```xml
...
<UrlBase>/sonarr</UrlBase>
...
```

Then restart the `sonarr` service:

```sh
systemctl restart sonarr.service
```

Now `https://isos.yourdomain.com/sonarr` is accessible. ==Secure the instance right away== by adding authentication under *Settings -> General -> Security*. I added the "Forms" option, just fill in the username and password then click on save changes on the top left of the page. You can restart the service again and check that it asks for login credentials.

Similar to [Radarr](#radarr) if you want to have an anime library, it is recommended to run a second instance of Sonarr for this as shown in [Sonarr: Linux multiple instances](https://wiki.servarr.com/sonarr/installation#linux-multiple-instances) and follow [TRaSH: Release profile regex (anime)](https://trash-guides.info/Sonarr/Sonarr-Release-Profile-RegEx-Anime/) and the [TRaSH: Anime recommended naming scheme](https://trash-guides.info/Sonarr/Sonarr-recommended-naming-scheme/#anime-episode-format) if an anime instance is what you want.

### Configuration

Will be following the official [Sonarr: Quick start guide](https://wiki.servarr.com/sonarr/quick-start-guide) as well as the recommendations by [TRaSH: Sonarr](https://trash-guides.info/Sonarr/).

Anything that is not mentioned in either guide or that is specific to how I'm setting up stuff will be stated below.

#### Media Management

- **File Management**:
    - *Propers and Repacks*: set it to "Do Not Prefer" and instead you'll use the [Propers and Repacks](https://trash-guides.info/Sonarr/Sonarr-Release-Profile-RegEx/#propers-and-repacks) release profile and fill with [P2P Groups + Repack/Proper](https://trash-guides.info/Sonarr/Sonarr-Release-Profile-RegEx/#p2p-groups-repackproper).

#### Quality

Similar to [Radarr: Quality](#quality) this is personal preference and it dictates your preferred file sizes. You can follow [TRaSH: Quality settings](https://trash-guides.info/Sonarr/Sonarr-Quality-Settings-File-Size/) to maximize the quality of the downloaded content and restrict low quality stuff.

Will basically do the same as in [Radarr: Quality](#quality): set minimum of `0` and maximum of `400` for everything `720p` and above.

#### Profiles

This is a bit different than with [Radarr](#radarr), the way it is configured is by setting "Release profiles". I took the profiles from [TRaSH: WEB-DL Release profile regex](https://trash-guides.info/Sonarr/Sonarr-Release-Profile-RegEx/). The only possible change I'll do is disable the Low Quality Groups and/or the "Golden rule" filter (for `x265` encoded video).

For me it ended up looking like this:

![Sonarr: Release profiles](${SURL}/images/b/sonarr/sonarr_release_profiles.png "Sonarr: Release profiles")

But yours can differ as its mostly personal preference. For the "Quality profile" I'll be using the default "HD-1080p" most of the time, but I also created a "HD + WEB (720/1080)" which works best for some.

#### Download clients

Exactly the same as with [Radarr: Download clients](#download-clients) only change is the category from `movies` to `tv` (or whatever you want), click on the giant "+" button and click on the qBitTorrent option. Then configure:

- Name: can be anything, just an identifier.
- Enable: enable it.
- Host: use `127.0.0.1`.
- Port: the port number you chose, `30000` in my case.
- Url Base: leave blank as even though you have it exposed under `/qbt`, the service itself is not.
- Username: the Web UI username, `admin` by default.
- Password: the Web UI username, `adminadmin` by default (you should've changed it if you have the service exposed).
- Category: `tv`.

Everything else can be left as default, but maybe change *Completed Download Handling* if you'd like. Same goes for the general *Failed Download Handling* download clients' option.

#### Indexers

Also exactly the same as with [Radarr: Indexers](#indexers), click on the giant "+" button and click on the *custom* Torznab option (this doesn't have the Jackett preset). Then configure:

- Name: can be anything, just an identifier. I like to do "Jackett - INDEXER", where "INDEXER" is just an identifier.
- URL: `http://127.0.0.1:9117/jack/api/v2.0/indexers/YOURINDEXER/results/torznab/`, where `YOURINDEXER` is specific to each indexer (`eztv`, `nyaasi`, etc.). Can be directly copied from the indexer's "Copy Torznab Feed" button on the Jackett Web UI.
- API Path: `/api`, leave as is.
- API Key: this can be found at the top right corner in Jackett's Web UI.
- Categories: which categories to use when searching, these are generic categories until you test/add the indexer. After you add the indexer you can come back and select your prefered categories (like just toggling the TV categories).
- Tags: I like to add a tag for the indexer name like `eztv` or `nyaa`. This is useful to control which indexers to use when adding new series.

Everything else on default. *Download Client* can also be set, which can be useful to keep different categories per indexer or something similar. *Seed Ratio* and *Seed Time* can also be set and are used to manage when to stop the torrent, this can also be set globally on the qBitTorrent Web UI, this is a personal setting.

### Download content

Almost the same as with [Radarr: Download content](#download-content), but I've been personally selecting the torrents I want to download for each season/episode so far, as the indexers I'm using are all over the place and I like consistencies. Will update if I find a (near) 100% automation process, but I'm fine with this anyways as I always monitor that everything is going fine.

Add by going to *Series -> Add New*. Basically just follow the [Sonarr: Library add new](https://wiki.servarr.com/sonarr/library#add-new) guide. Adding series needs a bit more options that movies in Radarr, but it's straight forward.

I personally use:

- Monitor: All Episodes.
- Quiality Profile: "HD + WEB (720/1080)". This depends on what I want for that how, lately I've been experimenting with this one.
- Series Type: Standard. For now I'm just downloading shows, but it has an Anime option.
- Tags: the "indexer_name" I want to use to download the movie, I've been using all indexers so I just use all tags as I'm experimenting and trying multiple options.
- Season Folder: enabled. I like as much organization as possible.
- Start search for missing episodes: disabled. Depends on you, due to my indexers, I prefer to check manually the season packs, for example.
- Start search for cutoff unmet episodes: disabled. Honestly don't really know what this is.

Once you click on "Add X" it will add it to the *Series* section and will start as monitored. So far I haven't noticed that it immediately starts downloading (because of the "Start search for missing episodes" setting) but I always click on unmonitor the series, so I can manually check (again, due to the low quality of my indexers).

When it automatically starts to download an episode/season it will send it to qBitTorrent and you can monitor it over there. Else you can also monitor at *Activity -> Queue*. Same thing goes if you download manually each episode/season via the interactive search.

To interactively search episodes/seasons go to *Series* and then click on any series, then click either on the interactive search button for the episode or the season, it is an icon of a person as shown below:

![Sonarr: Interactive search button](${SURL}/images/b/sonarr/sonarr_interactive_search_button.png "Sonarr: Interactive search button")

Then it will bring a window with the search results, where it shows the indexer it got the result from, the size of the torrent, peers, language, quality, the score it received from the configured release profiles an alert in case that the torrent is "bad" and the download button to manually download the torrent you want. An example shown below:

![Sonarr: Interactive search results](${SURL}/images/b/sonarr/sonarr_interactive_search_results.png "Sonarr: Interactive search results")

After the movie is downloaded and processed by Sonarr, it will create the appropriate hardlinks to the `media/tv` directory, as set in [Directory structure](https://blog.luevano.xyz/a/torrenting_with_qbittorrent.html#directory-structure).

Optionally, you can add subtitles using [Bazarr](#bazarr).

# Jellyfin

[Jellyfin](https://wiki.archlinux.org/title/Jellyfin) is a media server "manager", usually used to manage and organize video content (movies, TV series, etc.) which could be compared with [Plex](https://wiki.archlinux.org/title/plex) or [Emby](https://wiki.archlinux.org/title/Emby) for example (take them as possible alternatives).

Install from the AUR with `yay`:

```sh
yay -S jellyfin-bin
```

I'm installing the pre-built binary instead of building it as I was getting a lot of errors and the server was even crashing. You can try installing `jellyfin` instead.

==Add the `jellyfin` user to the `servarr` group:==

```sh
gpasswd -a jellyfin servarr
```

You can already `start`/`enable` the `jellyfin.service` which will start at `http://127.0.0.1:8096/` by default where you need to complete the initial set up. But let's create the reverse proxy first then start everything and finish the set up.

## Reverse proxy

I'm going to have my `jellyfin` instance under a subdomain with an `nginx` reverse proxy as shown in the [Arch wiki](https://wiki.archlinux.org/title/Jellyfin#Nginx_reverse_proxy). For that, create a `jellyfin.conf` at the usual `sites-<available/enabled>` path for `nginx`:

```nginx
server {
	listen 80;
    server_name jellyfin.yourdomain.com; # change accordingly to your wanted subdomain and domain name
    set $jellyfin 127.0.0.1; # jellyfin is running at localhost (127.0.0.1)

    # Security / XSS Mitigation Headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";

    # Content Security Policy
    # See: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
    # Enforces https content and restricts JS/CSS to origin
    # External Javascript (such as cast_sender.js for Chromecast) must be whitelisted.
    add_header Content-Security-Policy "default-src https: data: blob: http://image.tmdb.org; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://www.gstatic.com/cv/js/sender/v1/cast_sender.js https://www.youtube.com blob:; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'self'";

        location = / {
        return 302 https://$host/web/;
    }

    location / {
        # Proxy main Jellyfin traffic
        proxy_pass http://$jellyfin:8096;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Protocol $scheme;
        proxy_set_header X-Forwarded-Host $http_host;

        # Disable buffering when the nginx proxy gets very resource heavy upon streaming
        proxy_buffering off;
    }

    # location block for /web - This is purely for aesthetics so /web/#!/ works instead of having to go to /web/index.html/#!/
    location = /web/ {
        # Proxy main Jellyfin traffic
        proxy_pass http://$jellyfin:8096/web/index.html;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Protocol $scheme;
        proxy_set_header X-Forwarded-Host $http_host;
    }

    location /socket {
        # Proxy Jellyfin Websockets traffic
        proxy_pass http://$jellyfin:8096;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Protocol $scheme;
        proxy_set_header X-Forwarded-Host $http_host;
    }
}
```

### SSL certificate

Create/extend the certificate by running:

```sh
certbot --nginx
```

Similarly to the `isos` subdomain, that will autodetect the new subdomain and extend the existing certificate(s). Restart the `nginx` service for changes to take effect:

```sh
systemctl restart nginx.service
```

## Start using Jellyfin

You can now `start`/`enable` the `jellyfin.service` if you haven't already:

```sh
systemctl enable jellyfin.service
systemctl start jellyfin.service
```

Then navigate to `https://jellyfin.yourdomain.com` and either continue with the set up wizard if you didn't already or continue with the next steps to configure your libraries.

The initial setup wizard makes you create an user (will be the admin for now) and at least one library, though these can be done later. For more check [Jellyfin: Quick start](https://jellyfin.org/docs/general/quick-start/).

Remember to use the configured directory as mentioned in [Directory structure](https://blog.luevano.xyz/a/torrenting_with_qbittorrent.html#directory-structure). Any other configuration (like adding users or libraries) can be done at the dashboard: click on the 3 horizontal lines on the top left of the Web UI then navigate to *Administration -> Dashboard*. I didn't configure much other than adding a couple of users for me and friends, I wouldn't recommend using the admin account to watch (personal preference).

Once there is at least one library it will show at *Home* along with the latest movies (if any) similar to the following (don't judge, these are just the latest I added due to friend's requests):

![Jellyfin: Home libraries](${SURL}/images/b/jellyfin/jellyfin_home_libraries.png "Jellyfin: Home libraries")

And inside the "Movies" library you can see the whole catalog where you can filter or just scroll as well as seeing *Suggestions* (I think this starts getting populated after a while) and *Genres*:

![Jellyfin: Library catalog options](${SURL}/images/b/jellyfin/jellyfin_library_catalog_options.png "Jellyfin: Library catalog options")

### Plugins

You can also install/activate [plugins](https://jellyfin.org/docs/general/server/plugins/) to get extra features. Most of the plugins you might want to use are already available in the official repositories and can be found in the "Catalog". There are a lot of plugins that are focused around anime and TV metadata, as well as an Open Subtitles plugin to automatically download missing subtitles (though this is managed with [Bazarr](#bazarr)).

To activate plugins click on the 3 horizontal lines on the top left of the Web UI then navigate to *Administration -> Dashboard -> Advanced -> Plugins* and click on the *Catalog* tab (top of the Web UI). Here you can select the plugins you want to install. By default only the official ones are shown, for more you can add more [repositories](https://jellyfin.org/docs/general/server/plugins/#repositories).

The only plugin I'm using is the "Playback Reporting", to get a summary of what is being used in the instance. But I might experiment with some anime-focused plugins when the time comes.

### Transcoding

Although not recommended and explicitly set to not download any `x265`/`HEVC` content (by using the [Golden rule](https://trash-guides.info/Sonarr/Sonarr-Release-Profile-RegEx/#golden-rule)) there might be cases where the only option you have is to download such content. If that is the case and you happen to have a way to do [Hardware Acceleration](https://jellyfin.org/docs/general/administration/hardware-acceleration/), for example by having an NVIDIA graphics card (in my case) then you should enable it to avoid using lots of resources on your system.

Using hardware acceleration will leverage your GPU to do the transcoding and save resources on your CPU. I tried streaming `x265` content and it basically used 70-80% on all cores of my CPU, while on the other hand using my GPU it used the normal amount on the CPU (70-80% on a single core).

This will be the steps to install on an [NVIDIA](https://jellyfin.org/docs/general/administration/hardware-acceleration/nvidia/) graphics card, specifically a GTX 1660 Ti. But more info and guides can be found at [Jellyfin: Hardware Acceleration](https://jellyfin.org/docs/general/administration/hardware-acceleration/) for other acceleration methods.

#### NVIDIA drivers

Ensure you have the NVIDIA drivers and utils installed. I've you've done this in the past then you can skip this part, else you might be using the default `nouveau` drivers. Follow the next steps to set up the NVIDIA drivers, which basically is a summary of [NVIDIA: Installation](https://wiki.archlinux.org/title/NVIDIA#Installation) for my setup, so ==double check the wiki in case you have an older NVIDIA graphics card==.

Install the `nvidia` and `nvidia-utils` packages:

```sh
pacman -S nvidia nvidia-utils
```

Modify `/etc/mkinitcpio.conf` to remove `kms` from the `HOOKS` array. It should look like this (commented line is how it was for me before the change):

```sh
...
# HOOKS=(base udev autodetect modconf kms keyboard keymap consolefont block filesystems fsck)
HOOKS=(base udev autodetect modconf keyboard keymap consolefont block filesystems fsck)
...
```

[Regenerate the initramfs](https://wiki.archlinux.org/title/Mkinitcpio#Image_creation_and_activation) by executing:

```sh
mkinitcpio -P
```

Finally, reboot the system. After the reboot you should be able to check your GPU info and processes being run with the GPU by executing `nvidia-smi`.

#### Enable hardware acceleration

Install from the AUR with `yay`:

```sh
yay -S jellyfin-ffmpeg6-bin
```

This provides the `jellyfin-ffmpeg` executable, which is necessary for Jellyfin to do hardware acceleration, it needs to be this specific one.

Then in the Jellyfin go to the transcoding settings by clicking on the 3 horizontal lines on the top left of the Web UI and navigating to *Administration -> Dashboard -> Playback -> Transcoding* and:

- Change the *Hardware acceleration* from "None" to "Nvidia NVENC".
- Some other options will pop up, just make sure you enable "HEVC" (which is `x265`) in the list of *Enable hardware encoding for:*.
- Scroll down and specify the `ffmpeg` path, which is `/usr/lib/jellyfin-ffmpeg/ffmpeg`.

Don't forget to click "Save" at the bottom of the Web UI, it will ask if you want to enable hardware acceleration.

# Bazarr

[Bazarr](https://www.bazarr.media/) is a companion for Sonarr and Radarr that manages and downloads subtitles.

Install from the AUR with `yay`:

```sh
yay -S bazarr
```

==Add the `bazarr` user to the `servarr` group:==

```sh
gpasswd -a bazarr servarr
```

The default port that Bazarr uses is `6767` for http (the one you need for the reverse proxy), and it has pre-configured the default ports for Radarr and Sonarr.

## Reverse proxy

Basically the same as with [Radarr: Reverse proxy](#reverse-proxy) and [Sonarr: Reverse proxy](#reverse-proxy-1).

Add the following setting in the `server` block of the `isos.conf`:

```nginx 
server {
    # server_name and other directives
    ...

    # Increase http2 max sizes
    large_client_header_buffers 4 16k;

    # some other blocks like location blocks
    ...
}
```

Then add the following `location` blocks in the `isos.conf`, where I'll keep it as `/bazarr/`:

```nginx
location /bazarr/ {
    proxy_pass http://127.0.0.1:6767/bazarr/; # change port if needed
    proxy_http_version 1.1;

    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Host $http_host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";

    proxy_redirect off;
}
# Allow the Bazarr API through if you enable Auth on the block above
location /bazarr/api {
    auth_request off;
    proxy_pass http://127.0.0.1:6767/bazarr/api;
}
```

This is taken from [Bazarr: Reverse proxy help](https://wiki.bazarr.media/Additional-Configuration/Reverse-Proxy-Help/). Restart the `nginx` service for the changes to take effect:

```sh
systemctl restart nginx.service
```

## Start using Bazarr

You can now `start`/`enable` the `bazarr.service` if you haven't already:

```sh
systemctl start bazarr.service
systemctl enable bazarr.service
```

This will start the service and create the default configs under `/var/lib/bazarr`. You need to change the `base_url` for the necessary services as they're running under a reverse proxy and under subdirectories. Edit `/var/lib/bazarr/config/config.ini`:

```ini
[general]
port = 6767
base_url = /bazarr

[sonarr]
port = 8989
base_url = /sonarr

[radarr]
port = 7878
base_url = /radarr
```

Then restart the `bazarr` service:

```sh
systemctl restart bazarr.service
```

Now `https://isos.yourdomain.com/bazarr` is accessible. ==Secure the instance right away== by adding authentication under *Settings -> General -> Security*. I added the "Forms" option, just fill in the username and password then click on save changes on the top left of the page. You can restart the service again and check that it asks for login credentials. I also disabled *Settings -> General -> Updates -> Automatic*.

### Configuration

Will be following the official [Bazarr: Setup guide](https://wiki.bazarr.media/Getting-Started/setup-guide/) as well as the recommendations by [TRaSH: Bazarr](https://trash-guides.info/Bazarr/).

Anything that is not mentioned in either guide or that is specific to how I'm setting up stuff will be stated below.

#### Providers

This doesn't require much thinking and its up to personal preference, but I'll list the ones I added:

- [OpenSubtitles.com](https://www.opensubtitles.com/): requires an account (the `.org` option is deprecated).
    - For a free account it only lets you download around 20 subtitles per day, and they contain ads. You could pay for a VIP account ($3 per month) and that will give you 1000 subtitles per day and no ads. But if you're fine with 20 ads per day you can try to get rid of the ads by running an automated script. Such option can be found at [brianspilner01/media-server-scripts: sub-clean.sh](https://github.com/brianspilner01/media-server-scripts/blob/master/sub-clean.sh).
- YIFY Subtitles
- Subscenter
- Supersubtitles
- TVSubtitles
- Subtitulamos.tv: Spanish subtitles provider.
- Argenteam: LATAM Spanish subtitles provider.
- Subdivx: LATAM Spanish / Spanish subtitles provider.

I've tested this setup for the following languages (with all default settings as stated in the guides):

- English
- Spanish

I tried with "Latin American Spanish" but they're hard to find, those two work pretty good.

None of these require an [Anti-Captcha](https://anti-captcha.com/) account (which is a paid service), but I created one anyways in case I need it. Though you need to add credits to it (pretty cheap though) if you ever use it.
