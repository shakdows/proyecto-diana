# Estado de avance

| Fase | Entrega                                        | Estado        |
| :--: | ---------------------------------------------- | ------------- |
|  1   | Arquitectura y estructura del proyecto         | **Completa**  |
|  2   | Modelo PostgreSQL, relaciones, índices y RLS   | **Completa**  |
|  3   | Autenticación, usuarios, roles y seguridad     | Siguiente     |
| 4–12 | Ver `docs/00-plan-de-fases.md`                 | Pendientes    |

## Verificado en esta entrega

```
npm run typecheck      → sin errores
npm run lint           → sin errores
npm run build          → 6 rutas compiladas
migraciones 0000–0005  → aplicadas sobre PostgreSQL 16 real
db:seed:catalog        → 5 roles · 25 permisos · 5 empresas · 11 preguntas
db:seed:demo           → 136 encuestas · 40 vehículos · 5 empresas
db/tests/*.sql         → aislamiento corporativo y permisos por rol
```

Resultado de la prueba de aislamiento, con 136 encuestas cargadas:

| Sesión                      | Encuestas visibles          |
| --------------------------- | --------------------------- |
| Usuario de BBVA             | 30 (solo BBVA)              |
| Usuario de BBVA → Mitsui    | **0**                       |
| Analista interno            | 136 (todas)                 |

## Puesta en marcha

```bash
npm install
cp .env.example .env.local        # completar con el proyecto Supabase
npm run db:migrate                # aplica las 6 migraciones
npm run db:seed:catalog           # roles, permisos, empresas, cuestionario
npm run db:seed:demo              # datos de demostración (opcional)
npm run dev
```
