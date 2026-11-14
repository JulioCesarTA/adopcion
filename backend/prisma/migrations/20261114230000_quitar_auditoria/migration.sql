-- Elimina por completo el subsistema de auditoría.
--
-- ATENCIÓN: esta migración DESTRUYE el historial de auditoría. Se aplica por
-- decisión explícita de quitar la trazabilidad de acciones del alcance del
-- proyecto. Con esto deja de cumplirse la regla RN-09 de la especificación
-- original. Si alguna vez hay que recuperarla, hay que restaurar un respaldo
-- anterior a esta migración: la tabla era de solo lectura y no hay otra copia.

-- El trigger de solo lectura impediría cualquier operación sobre la tabla.
DROP TRIGGER IF EXISTS trg_audit_logs_readonly ON "audit_logs";
DROP FUNCTION IF EXISTS audit_logs_readonly();

-- La clave foránea hacia users desaparece junto con la tabla.
DROP TABLE IF EXISTS "audit_logs";
