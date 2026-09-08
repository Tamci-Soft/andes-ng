# Arquitectura de componentes y glosario

Esta guía explica el vocabulario y los límites de responsabilidad de Andes NG. Es una referencia para quienes creen, revisen o consuman componentes.

> Estado actual: el repositorio contiene únicamente el setup del workspace. Todavía no existe ningún componente, ningún token de producto ni ningún helper de prueba. Los límites descritos aquí son el contrato que deberá respetar el primer componente.

## Responsabilidades por paquete

| Paquete             | Responsabilidad                                                                                                                                         | No debe contener                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `@andes-ng/tokens`  | Valores de diseño agnósticos al framework: color, tipografía, escala de espacios, radios, sombras y foco. Se publican como propiedades CSS `--andes-*`. | Componentes Angular, selectores internos o comportamiento. |
| `@andes-ng/ui`      | Componentes Angular públicos, su API, composición con primitivas de comportamiento y CSS encapsulado que consume tokens.                                | Valores de marca duplicados, ni API pública de Spartan.    |
| `@andes-ng/testing` | Ayudantes de prueba estables basados en la API pública y la semántica de Andes.                                                                         | Selectores o tipos internos de Spartan.                    |
| `apps/playground`   | Aplicación no publicable para comprobar la experiencia de un consumidor real.                                                                           | Código que deba distribuirse como paquete.                 |

Estos límites están vigentes hoy: `@nx/enforce-module-boundaries` los verifica en cada `lint` mediante las etiquetas `type:tokens`, `type:ui`, `type:testing` y `type:app`.

## Tokens, CSS de componente y layout

La intuición de usar `tokens` para la identidad visual es correcta, con un matiz importante sobre dónde vive cada decisión:

- **Tokens** definen las decisiones reutilizables: color semántico, escala de espaciado, radios y tipografía.
- **El CSS de `ui`** decide cómo un componente aplica esos tokens: altura, `padding-inline`, `gap`, borde y variantes. No debería codificar un color corporativo ni un espaciado arbitrario que ya tenga token.
- **El layout de la aplicación** decide el espacio exterior entre componentes. Por regla general, un componente no trae `margin` propio: la pantalla o un contenedor de formulario deciden su separación de los demás elementos.

Así se obtiene identidad sin acoplar el componente a una pantalla concreta. Cambiar el valor de una variable semántica puede adaptar una familia visual o un tema; cambiar nombres, eliminar tokens o alterar su significado es un cambio de API pública y debe versionarse.

El catálogo de tokens todavía está vacío justamente por eso: los nombres son API pública bajo versionado semántico, y se definirán junto a los primeros componentes en lugar de adivinarse antes.

## Tailwind CSS, `tw-animate-css` y `clsx`

- **Tailwind CSS** genera CSS a partir de clases utilitarias encontradas en el código. No es el contrato de estilos de Andes: Andes publica sus tokens y el CSS encapsulado de sus componentes, de modo que una aplicación consumidora no necesita escanear el código de la biblioteca ni configurar Tailwind.
- **`tw-animate-css`** es un paquete de animaciones pensado para el ecosistema de Tailwind. Andes no lo importa ni lo usa.
- **`clsx`** es una utilidad pequeña para construir cadenas de clases CSS de manera condicional. Tampoco tiene un import directo en el código de Andes.

Los tres están presentes porque Spartan Brain los declara como requisitos de su ecosistema.

## Dependencias y _peers_

Una dependencia normal en `dependencies` se instala junto con el paquete que la declara. Una **peer dependency** es una declaración distinta: el paquete pide que el proyecto anfitrión proporcione una versión compatible de otra librería, para compartir una sola instancia.

Spartan Brain declara como _peers_ Angular, Angular CDK, RxJS, `clsx`, Tailwind CSS y `tw-animate-css`. Para Andes hay dos tratamientos:

- Angular, CDK y RxJS permanecen como _peers_ de `@andes-ng/ui`: una aplicación debe tener una sola instancia compatible del runtime de Angular.
- `@spartan-ng/brain`, `clsx`, Tailwind CSS y `tw-animate-css` son dependencias de implementación directas de `@andes-ng/ui`. Esto satisface el grafo de _peers_ de Brain de manera determinista al instalar Andes.

El `package.json` de la raíz también los declara como `devDependencies` para desarrollar y probar el monorepo. Eso no reemplaza las dependencias del paquete publicable: la raíz no existe cuando una aplicación instala `@andes-ng/ui` desde npm.

### Por qué están declaradas sin usarse todavía

`@andes-ng/ui` declara Brain y sus requisitos aunque ningún archivo los importe. Es una decisión deliberada: reserva el contrato del [ADR 0004](adr/0004-spartan-brain-behind-andes-adapters.md) y deja la instalación verificada por el build antes de que exista el primer componente.

Tiene un coste visible --Tailwind y `tw-animate-css` aparecen en el grafo de instalación sin aportar nada aún-- que se acepta a propósito. Mientras tanto, `@nx/dependency-checks` las lista en `ignoredDependencies` dentro de `packages/ui/eslint.config.mjs`; cada excepción se retira cuando su dependencia entra en uso real.

## `allowedNonPeerDependencies`

`ng-packagr` construye la biblioteca Angular. Como protección, exige revisar las dependencias que la biblioteca deja externas en vez de empaquetarlas dentro de su resultado. La lista `allowedNonPeerDependencies` de `packages/ui/ng-package.json` registra que esas excepciones son intencionales.

Esa lista no instala paquetes, no cambia sus versiones, no los convierte en _peers_ y no los incrusta en el bundle. La fuente de verdad para lo que recibirá un consumidor sigue siendo `packages/ui/package.json`; la lista solo permite que el empaquetado continúe con esas dependencias externas conocidas.

## Identidad empresarial y código abierto

Andes puede ser una biblioteca abierta y, a la vez, mantener una identidad consistente. La identidad técnica se expresa mediante tokens semánticos, componentes que los consumen, documentación y pruebas visuales/accesibles. La API pública debe describir conceptos de diseño (`primary`, `danger`, `surface`) y no detalles internos de una implementación.

Antes de publicar, el equipo debe acordar qué partes de la marca pueden reutilizar terceros --por ejemplo, nombre, logotipo y temas corporativos-- y documentarlo junto con la política de contribución y licencia elegida.
