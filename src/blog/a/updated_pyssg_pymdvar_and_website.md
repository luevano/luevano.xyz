title: Updated pyssg to include pymdvar and the website
author: David Luévano
lang: en
summary: Worked on another update of pyssg which now includes my extension pymdvar and updated the website overall.
tags: update
    tools
	short
	english

Again, I've updated [`pyssg`](${PYSSG_URL}) to add a bit of unit-testing as well as to include my extension [`pymdvar`](https://github.com/luevano/pymdvar) which is used to convert `${some_variables}` into their respective `values` based on a config file and/or environment variables. With this I also updated a bit of the CSS of the site as well as basically all the entries and base templates, a much needed update (for me, because externally doesn't look like much). Along with this I also added a "return to top" button, once you scroll enough on the site, a new button appears on the bottom right to get back to the top, also added table of contents to entries taht could use them (as well as a bit of CSS to them).

This update took a long time because I had a fundamental issue with how I was managing the "static" website, where I host all assets such as CSS, JS, images, etc.. Because I was using the `<base>` HTML tag. The issue is that this tag affects everything and there is no "opt-out" on some body tags, meaning that I would have to write the whole URL for all static assets. So I tried looking into changing how the image extension for [`python-markdown`](https://python-markdown.github.io/) works, so that it includes this "base" URL I needed. But it was too much hassle, so I ended up developing my own extension mentioned earlier. Just as a side note, I noticed that my extension doesn't cover all my needs, so probably it wont cover yours, if you end up using it just test it out a bit yourself and then go ahead, PRs are welcomed.

One thing led to another so I ended up changing a lot of stuff, and with changes comes tireness and eded up leaving the project for a while (again). This also led to not wanting to write or add anything else to the site until I sorted things out. But I'm again reviving it I guess, and up to the next cycle.

The next things I'll be doing are continuing with my [@gamedev](https://blog.luevano.xyz/tag/@gamedev) journey and probably upload some drawings if I feel like doing some.
