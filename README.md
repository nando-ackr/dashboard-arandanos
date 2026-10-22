# Dashboard IoT — Clasificador de Arándanos

Dashboard web estático en español, estilo blanco minimalista con azul, conectado al canal ThingSpeak `3545050`.

## Qué muestra

- Distancia (field1)
- Detección (field2)
- LED rojo (field3)
- LED verde (field4)
- Servo (field5)
- Gráfico de distancia, resumen de detecciones e historial reciente
- Actualización automática cada 20 segundos

## Seguridad importante

Esta versión no incluye claves API ni credenciales MQTT.

Para que el dashboard funcione directamente desde el navegador, el canal ThingSpeak debe estar configurado como **Public**. Eso significa que cualquier persona puede leer sus datos, no solo quien tenga el enlace del dashboard. No publiques información privada o sensible en ese canal.

Si necesitas mantener el canal privado, no pongas una Read API Key dentro de `app.js`: cualquier visitante podría verla. En ese caso se debe añadir un backend/función de servidor que guarde la clave como variable de entorno y entregue solo los datos necesarios.

## Publicar gratis en GitHub Pages

1. Descomprime el ZIP en tu computadora.
2. Crea o abre tu repositorio de GitHub. Si el repositorio será público, recuerda que estos archivos no contienen claves.
3. Sube `index.html`, `styles.css`, `app.js` y `README.md` a la raíz del repositorio.
4. En GitHub, abre **Settings → Pages**.
5. En **Build and deployment**, selecciona **Deploy from a branch**.
6. Selecciona la rama principal (`main`) y la carpeta `/ (root)`, y guarda.
7. Espera a que GitHub Pages genere la URL del sitio. Esa URL se puede compartir con cualquier persona.

No he publicado el sitio ni creado un repositorio por ti; estos son los archivos listos para subir.

## Probar localmente

Abre `index.html` en el navegador mientras tienes conexión a Internet. Si el navegador bloquea la consulta o hay problemas de origen, prueba con una extensión/servidor local sencillo o publica el sitio en GitHub Pages.

## Campos esperados en ThingSpeak

| Campo | Dato |
|---|---|
| field1 | Distancia en cm |
| field2 | Detectado (0/1) |
| field3 | LED rojo (0/1) |
| field4 | LED verde (0/1) |
| field5 | Servo (0/1) |

Asegúrate de que el script Python publique esos datos en esos campos.
