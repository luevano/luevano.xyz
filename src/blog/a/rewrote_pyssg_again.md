title: Rewrote pyssg again
author: David Luévano
lang: en
summary: Rewrote pyssg to make it more flexible and to work with YAML configuration files.
tags: update
    tools
	short
	english

I've been wanting to change the way [pyssg](https://github.com/luevano/pyssg) reads config files and generates `HTML` files so that it is more flexible and I don't need to have 2 separate build commands and configs (for [blog](https://blog.luevano.xyz) and [art](https://art.luevano.xyz)), and also to handle other types of "sites"; because `pyssg` was built with blogging in mind, so it was a bit limited to how it could be used. So I had to kind of *rewrite* `pyssg`, and with the latest version I can now generate the whole site and use the same templates for everything, quite neat for my use case.

Anyways, so I bought a new domain for all `pyssg` related stuff, mostly because I wanted somewhere to test live builds while developing, it is of course [pyssg.xyz](https://pyssg.xyz); as of now it is the same template, CSS and scripts that I use here, probably will change in the future. I'll be testing new features and anything `pyssg` related stuff.

I should start pointing all links to `pyssg` to the actual site instead of the github repository (or my [git](https://git.luevano.xyz) repository), but I haven't decided how to handle everything.