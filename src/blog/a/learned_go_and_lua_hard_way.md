title: I had to learn Go and Lua the hard way
author: David Luévano
lang: en
summary: Thanks to the issues of a program (mangal) I'm starting to use for my manga media server, I had to learn Go and Lua the hard way so that I can fix it and use it.
tags: short
	rant
	tools
	english

==TL;DR==: I learned Go and Lua the hard way by forking (for fixing):

- [mangal](https://github.com/luevano/mangal): main manga scraper written in Go.
- [mangal-lua-libs](https://github.com/luevano/mangal-lua-libs): [gopher-lua](https://github.com/yuin/gopher-lua) libraries for mangal.
- [mangal-scrapers](https://github.com/luevano/mangal-scrapers): custom mangal scrapers written in Lua.

In the last couple of days I've been setting up a [Komga](https://komga.org/) server for manga downloaded using [metafates/mangal](https://github.com/metafates/mangal) (upcoming set up entry about it) and everything was fine so far until I tried to download One Piece from [MangaDex](https://mangadex.org/) of which `mangal` has a built-in scraper. Long story short the issue was that MangaDex's API only allows requesting manga chapters on chunks of 500 and the way that was being handled was completely wrong, specifics can be found on my [commit](https://github.com/luevano/mangal/commit/395bce96e439ee828d0180328a5cf9204bfd818a) (and the subsequent minor fix [commit](https://github.com/luevano/mangal/commit/6bf709fe9b333ec9d4375ed80f9b055d07a40c1c)).

I tried to do a PR, but the project hasn't been active since Feb 2023 (same reason I didn't even try to do PRs on the other repos) so I closed it and will start working on my own [fork](https://github.com/luevano/mangal), probaly just merging everything [Belphemur](https://github.com/Belphemur)'s [fork](https://github.com/Belphemur/mangal) has to offer, as he's been working on `mangal` actively. I could probably just fork from him and/or just submit PR requests to him, but I think I saw some changes I didn't really like, will have to look more into it.

Also, while trying to use some of the custom scrapers I ran into issues with the headless chrome explorer implementation where it didn't close on each manga chapter download, causig my CPU and Mem usage to get maxed out and losing control of the system, so I had to also [fork](https://github.com/luevano/mangal-lua-libs) the [metafates/mangal-lua-libs](https://github.com/metafates/mangal-lua-libs) and "fixed" (I say fixed because that wasn't the issue at the end, it was how the custom scrapers where using it, shitty documentation) the issue by adding the `browser.Close()` function to the `headless` Lua API ([commit](https://github.com/luevano/mangal-lua-libs/commit/97fba97ab23efe88278dfacbeed2dd83c5472de0)) and merged some commits from the original [vadv/gopher-lua-libs](https://github.com/vadv/gopher-lua-libs) just to include any features added to the Lua libs needed.

Finally I [forked](https://github.com/luevano/mangal-scrapers) the [metafates/mangal-scrapers](https://github.com/metafates/mangal-scrapers) (which I actually forked [NotPhantomX](https://github.com/NotPhantomX)'s [fork](https://github.com/NotPhantomX/mangal-scrapers) as they had included more scrapers from some pull requests) to be able to have updated custom Lua scrapers (in which I also fixed the `headless` bullshit) and use them on my `mangal`.

So, I went into the rabbit hole of manga scrapping because I wanted to set up my Komga server, and more importantly I had to quickly learn Go and Lua (Lua was easier) and I have to say that Go is super convoluted on the module management, all research I did lead me to totally different responses, but it is just because of different Go versions and the year of the responses.
