{{/*
Expand the name of the chart.
*/}}
{{- define "theourgia.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name, truncated to the 63-char DNS limit.
*/}}
{{- define "theourgia.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Chart name and version as used by the chart label.
*/}}
{{- define "theourgia.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels.
*/}}
{{- define "theourgia.labels" -}}
helm.sh/chart: {{ include "theourgia.chart" . }}
{{ include "theourgia.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels (component label is added per-workload in the templates).
*/}}
{{- define "theourgia.selectorLabels" -}}
app.kubernetes.io/name: {{ include "theourgia.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Name of the Secret consumed by all workloads: the operator-provided
existingSecret when set, otherwise the chart-managed Secret.
*/}}
{{- define "theourgia.secretName" -}}
{{- if .Values.secrets.existingSecret }}
{{- .Values.secrets.existingSecret }}
{{- else }}
{{- include "theourgia.fullname" . }}
{{- end }}
{{- end }}

{{/*
Image reference for a component. Usage:
  {{ include "theourgia.image" (dict "image" .Values.backend.image "chart" .Chart) }}
*/}}
{{- define "theourgia.image" -}}
{{- printf "%s:%s" .image.repository (.image.tag | default .chart.AppVersion) }}
{{- end }}

{{/*
Service hostnames for the optional internal stores.
*/}}
{{- define "theourgia.postgresqlHost" -}}
{{- printf "%s-postgresql" (include "theourgia.fullname" .) }}
{{- end }}

{{- define "theourgia.redisHost" -}}
{{- printf "%s-redis" (include "theourgia.fullname" .) }}
{{- end }}

{{/*
DATABASE_URL resolution: internal evaluation StatefulSet when enabled,
otherwise the operator-provided external URL. Empty when neither is
configured — NOTES.txt warns about that instead of failing the render.
*/}}
{{- define "theourgia.databaseUrl" -}}
{{- if .Values.postgresql.internal.enabled }}
{{- printf "postgresql+asyncpg://%s:%s@%s:5432/%s" .Values.postgresql.internal.auth.username .Values.postgresql.internal.auth.password (include "theourgia.postgresqlHost" .) .Values.postgresql.internal.auth.database }}
{{- else }}
{{- .Values.postgresql.external.url }}
{{- end }}
{{- end }}

{{/*
REDIS_URL resolution, same pattern as DATABASE_URL.
*/}}
{{- define "theourgia.redisUrl" -}}
{{- if .Values.redis.internal.enabled }}
{{- printf "redis://%s:6379/0" (include "theourgia.redisHost" .) }}
{{- else }}
{{- .Values.redis.external.url }}
{{- end }}
{{- end }}

{{/*
Image pull secrets block, shared by every pod spec.
*/}}
{{- define "theourgia.imagePullSecrets" -}}
{{- with .Values.image.pullSecrets }}
imagePullSecrets:
{{- range . }}
  - name: {{ . }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Environment shared by backend, celery worker, and celery-beat: application
config plus the core secret references.
*/}}
{{- define "theourgia.coreEnv" -}}
- name: THEOURGIA_ENV
  value: {{ .Values.config.env | quote }}
- name: THEOURGIA_LOG_LEVEL
  value: {{ .Values.config.logLevel | quote }}
- name: THEOURGIA_SECRET_KEY
  valueFrom:
    secretKeyRef:
      name: {{ include "theourgia.secretName" . }}
      key: THEOURGIA_SECRET_KEY
- name: THEOURGIA_MASTER_ENCRYPTION_KEY
  valueFrom:
    secretKeyRef:
      name: {{ include "theourgia.secretName" . }}
      key: THEOURGIA_MASTER_ENCRYPTION_KEY
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
      name: {{ include "theourgia.secretName" . }}
      key: DATABASE_URL
- name: REDIS_URL
  valueFrom:
    secretKeyRef:
      name: {{ include "theourgia.secretName" . }}
      key: REDIS_URL
{{- end }}
