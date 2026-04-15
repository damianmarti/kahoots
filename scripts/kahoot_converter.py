#!/usr/bin/env python3
"""
Kahoot Results Converter

Script para convertir archivos de resultados de Kahoot en formato texto a CSV.
Convierte porcentajes a valores absolutos y calcula respuestas correctas e incorrectas.

Uso:
    python kahoot_converter.py <archivo_entrada> [archivo_salida] [--preguntas N]

Ejemplos:
    python kahoot_converter.py data/spark3.txt
    python kahoot_converter.py data/spark3.txt data/resultados.csv
    python kahoot_converter.py data/spark3.txt data/resultados.csv --preguntas 10

Autor: Generado por IA para procesar resultados de Kahoot
Fecha: 2026-04-15
"""

import csv
import re
import argparse
from pathlib import Path
import sys

def parse_kahoot_file(file_path, total_questions=8):
    """
    Parse the Kahoot results file and extract participant data
    
    Args:
        file_path (str): Path to the input file
        total_questions (int): Total number of questions in the Kahoot
        
    Returns:
        list: List of dictionaries with participant data
    """
    participants = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            lines = [line.strip() for line in file.readlines()]
    except FileNotFoundError:
        print(f"Error: No se pudo encontrar el archivo {file_path}")
        return []
    except Exception as e:
        print(f"Error al leer el archivo: {e}")
        return []
    
    # Skip header line
    i = 1
    
    while i < len(lines):
        line = lines[i].strip()
        
        # Skip empty lines
        if not line:
            i += 1
            continue
            
        # Look for participant name and ranking
        if '\t' in line and not line.startswith('—') and '%' not in line:
            # This should be a name line
            parts = line.split('\t')
            if len(parts) >= 2:
                name_and_ranking = parts[0].strip()
                
                # Skip lines that are clearly not participant names
                # - Single digits or very short numeric entries
                # - Empty strings
                # - Lines that look like data rather than names
                if (len(name_and_ranking) <= 2 and name_and_ranking.isdigit()) or \
                   not name_and_ranking or \
                   name_and_ranking in ['—', '-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']:
                    i += 1
                    continue
                
                # Extract just the name (remove extra whitespace)
                name = name_and_ranking
                
                # Look for the percentage in the next lines
                j = i + 1
                percentage = None
                
                while j < len(lines) and j < i + 5:  # Look at next few lines
                    next_line = lines[j].strip()
                    if '%' in next_line:
                        # Extract percentage
                        percentage_match = re.search(r'(\d+)\s*%', next_line)
                        if percentage_match:
                            percentage = int(percentage_match.group(1))
                            break
                    j += 1
                
                if percentage is not None:
                    # Calculate absolute correct answers
                    correctas = round((percentage / 100) * total_questions)
                    incorrectas = total_questions - correctas
                    
                    participants.append({
                        'Nombre': name,
                        'Correctas': correctas,
                        'Incorrectas': incorrectas,
                        'Porcentaje': f"{percentage}%"
                    })
        
        i += 1
    
    return participants

def write_csv(participants, output_path, include_percentage=True):
    """
    Write participants data to CSV file
    
    Args:
        participants (list): List of participant dictionaries
        output_path (str): Path for the output CSV file
        include_percentage (bool): Whether to include percentage column
    """
    try:
        with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
            if include_percentage:
                fieldnames = ['Nombre', 'Correctas', 'Incorrectas', 'Porcentaje']
            else:
                fieldnames = ['Nombre', 'Correctas', 'Incorrectas']
                
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            writer.writeheader()
            for participant in participants:
                if not include_percentage and 'Porcentaje' in participant:
                    # Create a copy without the percentage field
                    row = {k: v for k, v in participant.items() if k != 'Porcentaje'}
                    writer.writerow(row)
                else:
                    writer.writerow(participant)
                    
        print(f"✅ Archivo CSV creado exitosamente: {output_path}")
        
    except Exception as e:
        print(f"❌ Error al escribir el archivo CSV: {e}")

def show_statistics(participants, total_questions):
    """Show statistics about the conversion results"""
    if not participants:
        print("No hay datos para mostrar estadísticas.")
        return
        
    print(f"\n📊 Estadísticas de conversión:")
    print(f"Total de participantes: {len(participants)}")
    print(f"Total de preguntas: {total_questions}")
    
    # Distribution of correct answers
    correct_counts = {}
    for p in participants:
        correct = p['Correctas']
        correct_counts[correct] = correct_counts.get(correct, 0) + 1
    
    print("\n📈 Distribución de respuestas correctas:")
    for correct in sorted(correct_counts.keys(), reverse=True):
        count = correct_counts[correct]
        print(f"  {correct} correctas: {count} participante{'s' if count != 1 else ''}")
    
    # Best and worst performers
    best_score = max(p['Correctas'] for p in participants)
    worst_score = min(p['Correctas'] for p in participants)
    
    best_performers = [p['Nombre'] for p in participants if p['Correctas'] == best_score]
    worst_performers = [p['Nombre'] for p in participants if p['Correctas'] == worst_score]
    
    print(f"\n🥇 Mejor puntuación: {best_score}/{total_questions}")
    print(f"   Participantes: {', '.join(best_performers[:3])}" + 
          (f" y {len(best_performers)-3} más" if len(best_performers) > 3 else ""))
    
    if worst_score != best_score:
        print(f"\n📉 Menor puntuación: {worst_score}/{total_questions}")
        print(f"   Participantes: {', '.join(worst_performers[:3])}" + 
              (f" y {len(worst_performers)-3} más" if len(worst_performers) > 3 else ""))

def main():
    parser = argparse.ArgumentParser(
        description="Convierte archivos de resultados de Kahoot a formato CSV",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:
  %(prog)s data/spark3.txt
  %(prog)s data/spark3.txt --preguntas 10
  %(prog)s data/spark3.txt data/resultados.csv
  %(prog)s data/spark3.txt data/resultados.csv --preguntas 12 --sin-porcentaje
        """
    )
    
    parser.add_argument('input_file', 
                       help='Archivo de entrada con los resultados de Kahoot')
    parser.add_argument('output_file', nargs='?',
                       help='Archivo CSV de salida (opcional, se genera automáticamente si no se especifica)')
    parser.add_argument('--preguntas', '-p', type=int, default=8,
                       help='Número total de preguntas en el Kahoot (default: 8)')
    parser.add_argument('--sin-porcentaje', action='store_true',
                       help='No incluir la columna de porcentaje en el CSV')
    parser.add_argument('--quiet', '-q', action='store_true',
                       help='Modo silencioso, solo mostrar errores')
    
    args = parser.parse_args()
    
    # Validate input file
    input_path = Path(args.input_file)
    if not input_path.exists():
        print(f"❌ Error: El archivo {args.input_file} no existe")
        sys.exit(1)
    
    # Generate output filename if not provided
    if args.output_file:
        output_path = Path(args.output_file)
    else:
        output_path = input_path.with_suffix('.csv')
    
    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    if not args.quiet:
        print(f"🔄 Procesando {input_path}...")
        print(f"📁 Archivo de salida: {output_path}")
        print(f"❓ Total de preguntas: {args.preguntas}")
    
    # Parse the file
    participants = parse_kahoot_file(input_path, args.preguntas)
    
    if not participants:
        print("❌ No se pudieron extraer datos del archivo. Verifica el formato.")
        sys.exit(1)
    
    # Write CSV
    write_csv(participants, output_path, not args.sin_porcentaje)
    
    # Show statistics unless in quiet mode
    if not args.quiet:
        show_statistics(participants, args.preguntas)
        
        # Show preview of first few entries
        print(f"\n👀 Primeras {min(5, len(participants))} entradas:")
        for i, participant in enumerate(participants[:5]):
            print(f"  {i+1}. {participant['Nombre']}: {participant['Correctas']} correctas, {participant['Incorrectas']} incorrectas")
    
    print(f"\n✨ ¡Conversión completada exitosamente!")

if __name__ == "__main__":
    main()