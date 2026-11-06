# Widget Dólar

Cotizaciones del dólar en Argentina (oficial, blue, MEP, CCL, mayorista, cripto y tarjeta), con variación diaria, brecha contra el oficial y gráfico de los últimos 30 días.

Datos de [DolarApi](https://dolarapi.com) (cotización actual) y [ArgentinaDatos](https://argentinadatos.com) (histórico). Valores orientativos.

## Versión web

`index.html` es una página sin dependencias. Con GitHub Pages activado queda en
<https://gonzalonietot.github.io/widget-dolar/>.

Opciones por URL:

| Parámetro  | Ejemplo                  | Qué hace                                  |
|------------|--------------------------|-------------------------------------------|
| `tipos`    | `?tipos=blue,bolsa`      | Qué dólares mostrar y en qué orden        |
| `tema`     | `?tema=dark`             | Fuerza tema claro (`light`) u oscuro       |
| `refresco` | `?refresco=300`          | Segundos entre actualizaciones (mín. 60)  |

Valores de `tipos`: `oficial`, `blue`, `bolsa` (MEP), `contadoconliqui` (CCL), `mayorista`, `cripto`, `tarjeta`.

Para embeberla en otro sitio:

```html
<iframe src="https://gonzalonietot.github.io/widget-dolar/?tipos=blue,oficial,bolsa" width="100%" height="330" style="border:0"></iframe>
```

## Widget para iPhone (Scriptable)

`widget-dolar-scriptable.js` funciona en la app gratuita [Scriptable](https://apps.apple.com/app/scriptable/id1405459188). Soporta widget chico, mediano, grande y de pantalla bloqueada.

1. Instalá Scriptable desde el App Store.
2. Abrí este archivo en GitHub desde el iPhone, tocá **Raw** y copiá todo el texto.
3. En Scriptable tocá **+**, pegá el código y ponele de nombre "Dólar hoy". Tocá ▶ para ver la vista previa.
4. En la pantalla de inicio: mantené apretado → **Editar → Agregar widget → Scriptable**, elegí el tamaño.
5. Mantené apretado el widget → **Editar widget** → Script: "Dólar hoy".
   En **Parameter** podés poner los dólares a mostrar, por ejemplo `blue,mep,ccl`
   (valores: `oficial`, `blue`, `mep`, `ccl`, `mayorista`, `cripto`, `tarjeta`).

iOS decide cuándo refrescar los widgets (en general cada 15–30 minutos). Al tocarlo se abre la versión web.
