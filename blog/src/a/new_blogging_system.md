title: I'm using a new blogging system
author: David Luévano
lang: en
summary: I created a new blogging system called pyssg, which is based on what I was using but, to be honest, better.
tags: short
	update
	tools
	english
	pyssg

So, I was tired of working with `ssg` (and then `sbg` which was a modified version of `ssg` that I "wrote"), for one general reason: not being able to extend it as I would like; and not just dumb little stuff, I wanted to be able to have more control, to add tags (which another tool that I found does: `blogit`), and even more in a future.

The solution? Write a new program "from scratch" in *pYtHoN*. Yes it is bloated, yes it is in its early stages, but it works just as I want it to work, and I'm pretty happy so far with the results and have with even more ideas in mind to "optimize" and generally clean my wOrKfLoW to post new blog entries. I even thought of using it for posting into a "feed" like gallery for drawings or pictures in general.

I called it [`pyssg`](https://github.com/luevano/pyssg), because it sounds nice and it wasn't taken in the PyPi. It is just a terminal program that reads either a configuration file or the options passed as flags when calling the program.

It still uses Markdown files because I find them very easy to work with. And instead of just having a "header" and a "footer" applied to each parsed entry, you will have templates (generated with the program) for each piece that I thought made sense (idea taken from `blogit`): the common header and footer, the common header and footer for each entry and, header, footer and list elements for articles and tags. When parsing the Markdown file these templates are applied and stitched together to make a single HTML file. Also generates an RSS feed and the `sitemap.xml` file, which is nice.

It might sound convoluted, but it works pretty well, with of course room to improve; I'm open to suggestions, issue reporting or direct contributions [here](https://github.com/luevano/pyssg). BTW, it only works on Linux for now (and don't think on making it work on windows, but feel free to do PR for the compatibility).

That's it for now, the new RSS feed is available here: [https://blog.luevano.xyz/rss.xml](https://blog.luevano.xyz/rss.xml).
