title: Los devs de Android/MIUI me trozaron
author: David Luévano
lang: es
summary: Perdí un día completo resolviendo un problema muy estúpido, por culpa de los devs de Android/MIUI.
tags: rant
	update
	spanish

Llevo dos semanas posponiendo esta entrada porque andaba bien enojado (todavía, pero ya se anda pasando) y me daba *zzz*. Pero bueno, antes que nada este pex ocupa un poco de contexto sobre dos cositas:

- [Tachiyomi](https://tachiyomi.org/): Una aplicación de android que uso para descargar y leer manga. Lo importante aquí es que por default se guardan los mangas con cada página siendo una sola imagen, por lo que al mover el manga de un lado a otro tarda mucho tiempo.
- [Adoptable storage](https://source.android.com/devices/storage/adoptable): Un *feature* de android que básicamente te deja usar una micro SD (mSD) externa como si fuera interna, encriptando y dejando la mSD inutilizable en cualquier otro dispositivo. La memoria interna se *pierde* o algo por el estilo (bajo mi experiencia), por lo que parece es bastante útil cuando la capacidad de la memoria interna es baja.

Ahora sí vamonos por partes, primero que nada lo que sucedió fue que ordené una mSD con más capacidad que la que ya tenía (64 GB -> 512 GB, poggies), porque últimamente he estado bajando y leyendo mucho manga entonces me estaba quedando sin espacio. Ésta llegó el día de mi cumpleaños lo cuál estuvo chingón, me puse a hacer backup de la mSD que ya tenía y preparando todo, muy bonito, muy bonito.

Empecé a tener problemas, porque al estar moviendo tanto archivo pequeño (porque recordemos que el *tachiyomi* trata a cada página como una sola imagen), la conexión entre el celular y mi computadora se estaba corte y corte por alguna razón; en general muchos pedos. Por lo que mejor le saqué la nueva mSD y la metí directo a mi computadora por medio de un adaptador para batallar menos y que fuera más rápido.

Hacer este pedo de mover archivos directamente en la mSD puede llevar a corromper la memoria, no se los detalles pero pasa (o quizá estoy meco e hice algo mal). Por lo que al terminar de mover todo a la nueva mSD y ponerla en el celular, éste se emputó que porque no la detectaba y que quería tirar un formateo a la mSD. A este punto no me importaba mucho, sólo era questión de volvera mover archivos y ser más cuidadoso; "*no issues from my end*" diría en mis *standups*.

Todo valió **vergota** porque en cierto punto al elegir sí formatear la mSD mi celular me daba la opción de "*usar la micro SD para el celular*" o "*usar la micro SD como memoria portátil*" (o algo entre esas líneas), y yo, estúpidamente, elegí la primera, porque me daba sentido: "no, pues simón, voy a usar esta memoria para este celular".

Pues mamé, resulta que esa primera opción lo que realmente quería decir es que se iba a usar la micro SD como interna usando el pex este de *adoptable storage*. Entonces básicamente *perdí* mi capacidad de memoria interna (128 GB aprox.), y toda la mSD nueva se usó como memoria interna. Todo se juntó, si intentaba sacar la mSD todo se iba a la mierda y no podía usar muchas aplicaciones. "*No hay pedo*", pensé, "*nada más es cuestión de desactivar esta mamada de adoptable storage*".

Ni madres dijeron los devs de Android, este pedo nada más es un *one-way*: puedes activar *adoptable storage* pero para desactivarlo **ocupas, a huevo, formatear tu celular a estado de fábrica**. Chingué a mi madre, comí mierda, perdí.

Pues eso fue lo que hice, ni modo. Hice backup de todo lo que se me ocurrió (también me di cuenta que G\*\*gl\* authenticator es cagada ya que no te deja hacer backup, entre otras cosas, mejor usen [Aegis authenticator](https://getaegis.app/)), desactivé todo lo que se tenía que desactivar y tocó hacer *factory reset*, ni modo. Pero como siempre las cosas salen mal y tocó comer mierda del banco porque me bloquearon la tarjeta, perdí credenciales necesarias para el trabajo (se resolvió rápido), etc., etc.. Ya no importa, ya casi todo está resuelto, sólo queda ir al banco a resolver lo de la tarjeta bloqueada (esto es para otro *rant*, pinches apps de bancos piteras, ocupan hacer una sola cosa y la hacen mal).

Al final del día, la causa del problema fueron los malditos mangas (por andar queriendo *backupearlos*), que terminé bajando de nuevo manualmente y resultó mejor porque aparentemente *tachiyomi* agregó la opción de "*zippear*" los mangas en formato [CBZ](https://docs.fileformat.com/ebook/cbz/), por lo que ya son más fácil de mover de un lado para otro, el fono no se queda pendejo, etc., etc..

Por último, quiero decir que los devs de Android son unos pendejos por no hacer reversible la opción de *adoptable storage*, y los de MIUI son todavía más por no dar detalles de lo que significan sus opciones de formateo, especialmente si una opción es tan chingadora que para revertirla necesitas formatear a estado de fábrica tu celular; más que nada es culpa de los de MIUI, todavía que ponen un chingo de A(i)DS en todas sus apps, no pueden poner una buena descripción en sus opciones. **REEEE**.