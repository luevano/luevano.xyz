title: Así es raza, el blog ya tiene timestamps
author: David Luévano
lang: es
summary: Actualización en el estado del blog y el sistema usado para crearlo.
tags: short
	update
	tools
	spanish

Pues eso, esta entrada es sólo para tirar update sobre mi [primer post](https://blog.luevano.xyz/a/first_blog_post.html). Ya modifiqué el `ssg` lo suficiente como para que maneje los *timestamps*, y ya estoy más familiarizado con este script entonces ya lo podré extender más, pero por ahora las entradas ya tienen su fecha de creación (y modificación en dado caso) al final y en el índice ya están organizados por fecha, que por ahora está algo simple pero está sencillo de extender.

Ya lo único que queda es cambiar un poco el formato del blog (y de la página en general), porque en un momento de desesperación puse todo el texto en justificado y pues no se ve chido siempre, entonces queda corregir eso. *Y aunque me tomó más tiempo del que quisiera, así nomás quedó, diría un cierto personaje.*

~~El `ssg` modificado está en mis [dotfiles](https://git.luevano.xyz/.dots) (o directamente [aquí](https://git.luevano.xyz/.dots/tree/.local/bin/ssg)).~~
^^Como al final ya no usé el `ssg` modificado, este pex ya no existe.^^

Por último, también quité las extensiones `.html` de las URLs, porque se ve bien pitero, pero igual los links con `.html` al final redirigen a su link sin `.html`, así que no hay rollo alguno.

**Actualización**: Ahora estoy usando mi propia solución en vez de `ssg`, que la llamé [`pyssg`](${PYSSG_URL}), de la cual empiezo a hablar [acá](https://blog.luevano.xyz/a/new_blogging_system.html).
