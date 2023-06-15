title: Set up a media server with Jellyfin, Sonarr and Radarr
author: David Luévano
lang: en
summary: How to set up a media server with Jellyfin, Sonarr and Radarr, on Arch. With qBitTorrent and Jackett also.
tags: server
	tools
	code
	tutorial
	english

Riding on my excitement of having a good internet connection and having setup my *home server* now it's time to self host a media server for movies, series and anime. Everything here is performed in ==Arch Linux btw== and all commands should be run as root unless stated otherwise, as always.

I'll be exposing my stuff on a personal subdomain, but that's optional depending on your setup.

# Table of contents

[TOC]

# Prerequisites

Similar to my early [tutorial](https://blog.luevano.xyz/tag/@tutorial.html) entries, if you want it as a subdomain:

- An **A** (and/or **AAAA**) or a **CNAME** for `jellyfin` (or whatever you want).
    - Optionally, another one for all *iso downloading software* (wink).
- An SSL certificate, if you're following the other entries (specially the [website](https://blog.luevano.xyz/a/website_with_nginx.html) entry), add a `jellyfin.conf` (and optionally the *isos* subdomain config) and run `certbot --nginx` (or similar) to extend/create the certificate.
- `yay` installed. I mentioned how to install and use it on my previous entry: [Manga server with Komga: yay](https://blog.luevano.xyz/a/manga_server_with_komga.html#yay)

# qBitTorrent


# Jellyfin

[Jellyfin](https://wiki.archlinux.org/title/Jellyfin) is a media server "manager", usually used to manage and organize video content (movies, TV series, etc.) which could be compared with [Plex](https://wiki.archlinux.org/title/plex) or [Emby](https://wiki.archlinux.org/title/Emby) for example (take them as possible alternatives).

Install from the AUR with `yay`:

```sh
pacman -S jellyfin-bin
```

That's the pre-built binary, but you can build from source with `yay` by installing `jellyfin` (or from the latest `git` commit with `jellyfin-git`).