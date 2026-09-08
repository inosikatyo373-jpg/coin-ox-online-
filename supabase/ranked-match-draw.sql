-- Preserve the existing ranked-match function, permissions and win/loss formula.
-- Run once against the existing v3.2 ranked database; safe to run again.
do $patch$
declare
  definition text;
  marker text := '  result0 := case p_result';
begin
  definition := pg_get_functiondef('public.record_ranked_match(uuid,uuid,text)'::regprocedure);
  if position('-- Match draws preserve both ratings.' in definition)>0 then return; end if;
  if position(marker in definition)=0 then
    raise exception 'Unexpected record_ranked_match definition; review before updating';
  end if;
  definition := replace(definition, marker,
    E'  -- Match draws preserve both ratings.\n  if p_result = ''draw'' then\n    new0 := r0;\n    new1 := r1;\n    delta0 := 0;\n    delta1 := 0;\n  end if;\n\n' || marker);
  execute definition;
end;
$patch$;
