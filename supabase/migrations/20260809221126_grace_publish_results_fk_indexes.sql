create index if not exists grace_publish_results_post_id_idx
  on public.grace_publish_results(post_id);

create index if not exists grace_publish_results_target_id_idx
  on public.grace_publish_results(target_id)
  where target_id is not null;
