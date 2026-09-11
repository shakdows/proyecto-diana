# Pruebas de las políticas RLS

Verifican la propiedad más importante del sistema: **un cliente corporativo no
puede ver datos de otro**, y cada rol puede hacer exactamente lo que le
corresponde.

Se ejecutan contra una base con el catálogo y los datos DEMO ya cargados:

```bash
psql "$DATABASE_URL" -f db/tests/01-aislamiento-corporativo.sql
psql "$DATABASE_URL" -f db/tests/02-permisos-por-rol.sql
```

Todo ocurre dentro de transacciones que terminan en `ROLLBACK`: las pruebas no
dejan rastro.

## Qué debe salir

| Comprobación                                           | Resultado esperado                          |
| ------------------------------------------------------ | ------------------------------------------- |
| Usuario BBVA consulta encuestas                        | solo las de BBVA                            |
| Usuario BBVA fuerza el filtro a Mitsui                 | **0 filas**, no un error revelador          |
| Usuario BBVA intenta borrar encuestas                  | 0 filas afectadas (no hay política DELETE)  |
| Usuario BBVA intenta asignarse otra empresa            | sin efecto                                  |
| Analista interno consulta encuestas                    | todas las empresas                          |
| Analista intenta registrar una encuesta                | `new row violates row-level security policy` |
| Encuestador registra una encuesta                      | insertada, con código `ENC-AAAA-NNNNNN`     |
| Encuestador pide el DNI completo                       | `forbidden` (no tiene `customers:read_pii`) |

Estas pruebas descubrieron dos defectos reales durante la FASE 2: faltaba el
permiso de uso sobre la secuencia del código de encuesta, y el alcance de datos
estaba atado a `dashboard:read_all_clients`, lo que dejaba al encuestador sin
poder trabajar. Ambos están corregidos en las migraciones 0004 y 0005.
