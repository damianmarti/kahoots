#!/bin/bash

# Ejemplos de uso del Kahoot Converter
# Ejecutar desde el directorio raíz del proyecto: bash scripts/ejemplo_uso.sh

echo "🎯 Ejemplos de uso del Kahoot Converter"
echo "========================================"

# Ejemplo básico
echo ""
echo "📝 Ejemplo 1: Conversión básica (8 preguntas por defecto)"
echo "Comando: python3 scripts/kahoot_converter.py data/spark3.txt"
echo ""

# Ejemplo con número personalizado de preguntas
echo "📝 Ejemplo 2: Kahoot con 10 preguntas"
echo "Comando: python3 scripts/kahoot_converter.py data/quiz10.txt --preguntas 10"
echo ""

# Ejemplo con archivo de salida personalizado
echo "📝 Ejemplo 3: Especificar archivo de salida"
echo "Comando: python3 scripts/kahoot_converter.py data/spark3.txt resultados/mi_quiz.csv"
echo ""

# Ejemplo sin porcentajes
echo "📝 Ejemplo 4: CSV sin columna de porcentaje"
echo "Comando: python3 scripts/kahoot_converter.py data/spark3.txt --sin-porcentaje"
echo ""

# Ejemplo modo silencioso
echo "📝 Ejemplo 5: Modo silencioso para scripts automatizados"
echo "Comando: python3 scripts/kahoot_converter.py data/spark3.txt --quiet"
echo ""

# Mostrar estructura de archivos
echo "📁 Estructura recomendada de archivos:"
echo "├── data/"
echo "│   ├── spark3.txt       (archivo original de Kahoot)"
echo "│   └── spark3.csv       (archivo CSV generado)"
echo "├── scripts/"
echo "│   ├── kahoot_converter.py"
echo "│   ├── README.md"
echo "│   └── ejemplo_uso.sh"
echo "└── resultados/          (directorio opcional para CSVs)"
echo ""

echo "💡 Para ver todas las opciones disponibles:"
echo "python3 scripts/kahoot_converter.py --help"