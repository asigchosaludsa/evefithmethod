-- 0004_rls_policies.sql
-- Enable RLS on every table and define access policies.
-- Pattern: a broad "<table>_select" policy + a narrower "<table>_modify" (for all)
-- policy for writers. Permissive policies combine with OR, so the broad select
-- always wins for reads. Coach-only tables use a single "for all" policy.

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.coach_profiles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.coach_students enable row level security;
alter table public.invitations enable row level security;
alter table public.nutrition_plans enable row level security;
alter table public.nutrition_plan_food_recommendations enable row level security;
alter table public.food_items enable row level security;
alter table public.food_logs enable row level security;
alter table public.food_log_items enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_plan_days enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_plan_exercises enable row level security;
alter table public.workout_logs enable row level security;
alter table public.workout_log_sets enable row level security;
alter table public.weight_entries enable row level security;
alter table public.body_measurements enable row level security;
alter table public.progress_photos enable row level security;
alter table public.content_posts enable row level security;
alter table public.content_assignments enable row level security;
alter table public.coach_notes enable row level security;
alter table public.student_checkins enable row level security;
alter table public.alerts enable row level security;
alter table public.auth_events enable row level security;

-- ============================ profiles ============================
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin() or public.coach_has_student(auth.uid(), id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ======================== coach_profiles =========================
create policy coach_profiles_select on public.coach_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy coach_profiles_modify on public.coach_profiles for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ======================= student_profiles ========================
create policy student_profiles_select on public.student_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or public.coach_has_student(auth.uid(), user_id));
create policy student_profiles_modify on public.student_profiles for all to authenticated
  using (user_id = auth.uid() or public.coach_has_student(auth.uid(), user_id))
  with check (user_id = auth.uid() or public.coach_has_student(auth.uid(), user_id));

-- ======================== coach_students =========================
create policy coach_students_select on public.coach_students for select to authenticated
  using (coach_id = auth.uid() or student_id = auth.uid() or public.is_admin());
create policy coach_students_modify on public.coach_students for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- ========================== invitations ==========================
create policy invitations_all on public.invitations for all to authenticated
  using (coach_id = auth.uid() or public.is_admin())
  with check (coach_id = auth.uid());

-- ======================== nutrition_plans ========================
create policy nutrition_plans_select on public.nutrition_plans for select to authenticated
  using (coach_id = auth.uid() or student_id = auth.uid() or public.is_admin());
create policy nutrition_plans_modify on public.nutrition_plans for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- ============= nutrition_plan_food_recommendations ===============
create policy nutrition_recs_select on public.nutrition_plan_food_recommendations for select to authenticated
  using (exists (
    select 1 from public.nutrition_plans p
    where p.id = nutrition_plan_id and (p.coach_id = auth.uid() or p.student_id = auth.uid())
  ));
create policy nutrition_recs_modify on public.nutrition_plan_food_recommendations for all to authenticated
  using (exists (select 1 from public.nutrition_plans p where p.id = nutrition_plan_id and p.coach_id = auth.uid()))
  with check (exists (select 1 from public.nutrition_plans p where p.id = nutrition_plan_id and p.coach_id = auth.uid()));

-- =========================== food_items ==========================
create policy food_items_select on public.food_items for select to authenticated
  using (is_public or created_by = auth.uid() or public.is_admin());
create policy food_items_modify on public.food_items for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- =========================== food_logs ===========================
create policy food_logs_select on public.food_logs for select to authenticated
  using (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id) or public.is_admin());
create policy food_logs_student_modify on public.food_logs for all to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());
create policy food_logs_coach_update on public.food_logs for update to authenticated
  using (public.coach_has_student(auth.uid(), student_id))
  with check (public.coach_has_student(auth.uid(), student_id));

-- ========================= food_log_items ========================
create policy food_log_items_select on public.food_log_items for select to authenticated
  using (exists (
    select 1 from public.food_logs fl
    where fl.id = food_log_id and (fl.student_id = auth.uid() or public.coach_has_student(auth.uid(), fl.student_id))
  ));
create policy food_log_items_modify on public.food_log_items for all to authenticated
  using (exists (select 1 from public.food_logs fl where fl.id = food_log_id and fl.student_id = auth.uid()))
  with check (exists (select 1 from public.food_logs fl where fl.id = food_log_id and fl.student_id = auth.uid()));

-- ========================= workout_plans =========================
create policy workout_plans_select on public.workout_plans for select to authenticated
  using (coach_id = auth.uid() or student_id = auth.uid() or public.is_admin());
create policy workout_plans_modify on public.workout_plans for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- ======================= workout_plan_days =======================
create policy workout_plan_days_select on public.workout_plan_days for select to authenticated
  using (exists (
    select 1 from public.workout_plans p
    where p.id = workout_plan_id and (p.coach_id = auth.uid() or p.student_id = auth.uid())
  ));
create policy workout_plan_days_modify on public.workout_plan_days for all to authenticated
  using (exists (select 1 from public.workout_plans p where p.id = workout_plan_id and p.coach_id = auth.uid()))
  with check (exists (select 1 from public.workout_plans p where p.id = workout_plan_id and p.coach_id = auth.uid()));

-- =========================== exercises ===========================
create policy exercises_select on public.exercises for select to authenticated
  using (
    is_global
    or coach_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.coach_students cs
      where cs.student_id = auth.uid() and cs.coach_id = exercises.coach_id and cs.status = 'active'
    )
  );
create policy exercises_modify on public.exercises for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- ===================== workout_plan_exercises ====================
create policy workout_plan_exercises_select on public.workout_plan_exercises for select to authenticated
  using (exists (
    select 1 from public.workout_plan_days d
    join public.workout_plans p on p.id = d.workout_plan_id
    where d.id = workout_plan_day_id and (p.coach_id = auth.uid() or p.student_id = auth.uid())
  ));
create policy workout_plan_exercises_modify on public.workout_plan_exercises for all to authenticated
  using (exists (
    select 1 from public.workout_plan_days d
    join public.workout_plans p on p.id = d.workout_plan_id
    where d.id = workout_plan_day_id and p.coach_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.workout_plan_days d
    join public.workout_plans p on p.id = d.workout_plan_id
    where d.id = workout_plan_day_id and p.coach_id = auth.uid()
  ));

-- ========================== workout_logs =========================
create policy workout_logs_select on public.workout_logs for select to authenticated
  using (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id) or public.is_admin());
create policy workout_logs_student_modify on public.workout_logs for all to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- ======================== workout_log_sets =======================
create policy workout_log_sets_select on public.workout_log_sets for select to authenticated
  using (exists (
    select 1 from public.workout_logs wl
    where wl.id = workout_log_id and (wl.student_id = auth.uid() or public.coach_has_student(auth.uid(), wl.student_id))
  ));
create policy workout_log_sets_modify on public.workout_log_sets for all to authenticated
  using (exists (select 1 from public.workout_logs wl where wl.id = workout_log_id and wl.student_id = auth.uid()))
  with check (exists (select 1 from public.workout_logs wl where wl.id = workout_log_id and wl.student_id = auth.uid()));

-- ===== weight_entries / body_measurements / progress_photos / student_checkins =====
-- student owns; assigned coach can read + write.
create policy weight_entries_select on public.weight_entries for select to authenticated
  using (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id) or public.is_admin());
create policy weight_entries_modify on public.weight_entries for all to authenticated
  using (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id))
  with check (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id));

create policy body_measurements_select on public.body_measurements for select to authenticated
  using (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id) or public.is_admin());
create policy body_measurements_modify on public.body_measurements for all to authenticated
  using (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id))
  with check (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id));

create policy progress_photos_select on public.progress_photos for select to authenticated
  using (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id) or public.is_admin());
create policy progress_photos_modify on public.progress_photos for all to authenticated
  using (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id))
  with check (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id));

create policy student_checkins_select on public.student_checkins for select to authenticated
  using (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id) or public.is_admin());
create policy student_checkins_modify on public.student_checkins for all to authenticated
  using (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id))
  with check (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id));

-- ========================= content_posts =========================
create policy content_posts_select on public.content_posts for select to authenticated
  using (
    coach_id = auth.uid()
    or public.is_admin()
    or (status = 'published' and exists (
      select 1 from public.content_assignments ca
      where ca.content_post_id = content_posts.id and ca.student_id = auth.uid()
    ))
  );
create policy content_posts_modify on public.content_posts for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- ====================== content_assignments ======================
create policy content_assignments_select on public.content_assignments for select to authenticated
  using (coach_id = auth.uid() or student_id = auth.uid() or public.is_admin());
create policy content_assignments_coach_modify on public.content_assignments for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
-- student may mark their own assignment as read (read_at).
create policy content_assignments_student_update on public.content_assignments for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- =========================== coach_notes =========================
create policy coach_notes_all on public.coach_notes for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- ============================= alerts ============================
create policy alerts_all on public.alerts for all to authenticated
  using (coach_id = auth.uid() or public.is_admin())
  with check (coach_id = auth.uid());

-- ========================== auth_events ==========================
create policy auth_events_select on public.auth_events for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy auth_events_insert on public.auth_events for insert to authenticated
  with check (user_id = auth.uid());
