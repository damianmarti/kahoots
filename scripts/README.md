# Kahoot Results Converter

Script para convertir archivos de resultados de Kahoot en formato texto a CSV estructurado.

## Características

- ✅ Convierte porcentajes a valores absolutos
- 📊 Calcula respuestas correctas e incorrectas
- 📈 Muestra estadísticas detalladas
- 🔧 Configurable para diferentes números de preguntas
- 💾 Genera CSV limpio y estructurado
- 🎯 Manejo robusto de errores
- 🛡️ Filtrado inteligente de datos incorrectos (evita interpretar números sueltos como nombres)

## Instalación

No requiere instalación adicional. Solo necesitas Python 3.6+ (incluido por defecto en la mayoría de sistemas).

## Uso Básico

```bash
# Conversión simple (asume 8 preguntas)
python3 scripts/kahoot_converter.py data/spark3.txt

# Especificar archivo de salida
python3 scripts/kahoot_converter.py data/spark3.txt data/resultados.csv

# Kahoot con diferente número de preguntas
python3 scripts/kahoot_converter.py data/quiz10.txt --preguntas 10

# Sin incluir columna de porcentaje
python3 scripts/kahoot_converter.py data/spark3.txt --sin-porcentaje

# Modo silencioso (solo errores)
python3 scripts/kahoot_converter.py data/spark3.txt --quiet
```

## Opciones Disponibles

| Opción | Descripción | Ejemplo |
|--------|-------------|---------|
| `--preguntas, -p` | Número total de preguntas | `--preguntas 12` |
| `--sin-porcentaje` | No incluir columna de porcentaje | `--sin-porcentaje` |
| `--quiet, -q` | Modo silencioso | `--quiet` |
| `--help, -h` | Mostrar ayuda | `--help` |

## Formato de Entrada

El script espera archivos con el siguiente formato (como los exporta Kahoot):

```
Nombre	Clasificación	Respuestas correctas	Sin respuesta	Puntuación final
100162 - Cris	1	
100 %
—	7055
112158 Bono	2	
88 %
—	6500
...
```

## Formato de Salida

El CSV generado tendrá las siguientes columnas:

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| `Nombre` | Nombre del participante | `100162 - Cris` |
| `Correctas` | Respuestas correctas (absoluto) | `8` |
| `Incorrectas` | Respuestas incorrectas | `0` |
| `Porcentaje` | Porcentaje original (opcional) | `100%` |

## Ejemplos de Uso

### Ejemplo 1: Kahoot de 8 preguntas (por defecto)
```bash
python3 scripts/kahoot_converter.py data/spark3.txt
```

**Salida:**
```
🔄 Procesando data/spark3.txt...
📁 Archivo de salida: data/spark3.csv
❓ Total de preguntas: 8
✅ Archivo CSV creado exitosamente: data/spark3.csv

📊 Estadísticas de conversión:
Total de participantes: 41
Total de preguntas: 8

📈 Distribución de respuestas correctas:
  8 correctas: 7 participantes
  7 correctas: 10 participantes
  6 correctas: 16 participantes
  5 correctas: 7 participantes
  4 correctas: 1 participante
```

### Ejemplo 2: Kahoot de 10 preguntas con archivo personalizado
```bash
python3 scripts/kahoot_converter.py data/quiz_avanzado.txt resultados/quiz_avanzado.csv --preguntas 10
```

### Ejemplo 3: Conversión rápida sin estadísticas
```bash
python3 scripts/kahoot_converter.py data/spark3.txt --quiet --sin-porcentaje
```

## Solución de Problemas

### Error: "No se pudo encontrar el archivo"
- Verifica que la ruta del archivo sea correcta
- Asegúrate de estar en el directorio correcto del proyecto

### Error: "No se pudieron extraer datos del archivo"
- Verifica que el archivo tenga el formato correcto de Kahoot
- Asegúrate de que el archivo no esté vacío o corrupto

### Resultados inesperados
- Verifica que el número de preguntas sea correcto (`--preguntas`)
- Revisa el archivo original para detectar formatos no estándar
- El script automáticamente filtra números sueltos o caracteres que no son nombres válidos

### Casos especiales manejados
- **Números sueltos en lugar de guiones**: El script ignora automáticamente números de 1-2 dígitos que aparecen donde deberían ir guiones
- **Líneas malformadas**: Se saltan automáticamente líneas que no siguen el patrón esperado
- **Caracteres especiales**: Se manejan correctamente guiones, espacios y caracteres Unicode en los nombres

## Archivos Relacionados

- `kahoot_converter.py` - Script principal
- `README.md` - Esta documentación
- `../data/` - Directorio típico para archivos de entrada
- `../data/*.csv` - Archivos CSV generados

## Historial de Versiones

- **v1.0** (2026-04-15) - Versión inicial con funcionalidad completa

---

*Script generado por IA para facilitar el procesamiento de resultados de Kahoot*