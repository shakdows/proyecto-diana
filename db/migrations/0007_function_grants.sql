-- Permisos de ejecución de funciones.
--
-- ⚠️ TRAMPA VERIFICADA CONTRA LA BASE.
--
-- PostgreSQL concede `EXECUTE` a `PUBLIC` por defecto en toda función que se
-- crea. Un `revoke execute ... from anon` NO surte efecto: `anon` sigue
-- heredando el permiso a través de `PUBLIC`.
--
-- Consecuencia real, detectada por `db/tests/03-portal-anonimo.sql`: el rol
-- anónimo del portal podía ejecutar TODAS las funciones SECURITY DEFINER del
-- esquema, incluidas `reveal_document_number` y las de resolución de permisos.
-- Sus guardas internas las hacían inofensivas —`auth.uid()` es nulo para
-- `anon`—, pero depender de eso es apoyarse en una segunda línea cuando la
-- primera debería existir.
--
-- La forma correcta es revocar de `PUBLIC` y conceder explícitamente.

revoke execute on all functions in schema public from public;
--> statement-breakpoint
revoke execute on all functions in schema public from anon;
--> statement-breakpoint

grant execute on all functions in schema public to authenticated;
--> statement-breakpoint
grant execute on all functions in schema public to service_role;
--> statement-breakpoint

-- El visitante anónimo alcanza EXACTAMENTE una función. `portal_get_quotation`
-- es SECURITY DEFINER, así que las funciones que llama por dentro se ejecutan
-- como propietario: `anon` no necesita —ni recibe— permiso sobre ellas.
grant execute on function public.portal_get_quotation(text) to anon;
--> statement-breakpoint

-- Lo mismo para las funciones que se creen en el futuro: por defecto, nadie.
alter default privileges in schema public revoke execute on functions from public;
