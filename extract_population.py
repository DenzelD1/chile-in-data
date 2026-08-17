import csv
import json

def generar_json_poblacion(archivo_entrada, archivo_salida, anio_inicio=2026):
    datos = {}
    seccion_actual = None
    anios = []
    
    with open(archivo_entrada, 'r', encoding='latin1') as f:
        lector = csv.reader(f, delimiter=';')
        
        for fila in lector:
            if not fila:
                continue
                
            # Extraer los años de la fila de cabecera
            if fila[0].startswith('Sexo / Edad'):
                anios = [int(a) for a in fila[1:] if a.strip()]
                
            # Identificar qué bloque estamos leyendo
            elif fila[0] in ['Ambos sexos', 'Hombres', 'Mujeres']:
                seccion_actual = fila[0]
                
            # Extraer la fila de "Total" de cada bloque
            elif fila[0] == 'Total' and seccion_actual:
                # Recorrer cada columna de la fila Total
                for i, valor_str in enumerate(fila[1:]):
                    if i < len(anios):
                        anio = anios[i]
                        
                        # Guardar solo desde el año_inicio (2026)
                        if anio >= anio_inicio:
                            anio_str = str(anio)
                            if anio_str not in datos:
                                datos[anio_str] = {}
                            
                            # Limpiar los puntos de separador de miles y convertir a entero
                            valor = int(valor_str.replace('.', ''))
                            
                            if seccion_actual == 'Ambos sexos':
                                datos[anio_str]['Total'] = valor
                            elif seccion_actual == 'Hombres':
                                datos[anio_str]['Hombres'] = valor
                            elif seccion_actual == 'Mujeres':
                                datos[anio_str]['Mujeres'] = valor

    # Guardar en el formato JSON deseado
    with open(archivo_salida, 'w', encoding='utf-8') as f_out:
        json.dump(datos, f_out, indent=4, ensure_ascii=False)
        
    print(f"Archivo guardado exitosamente como: {archivo_salida}")

# Ejecutar la función
generar_json_poblacion('poblacion.csv', 'datos_poblacion_2026_2070.json')