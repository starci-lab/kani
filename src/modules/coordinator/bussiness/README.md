# Kubernetes Labels & Annotations Usage

This document describes how **labels** and **annotations** are used in the Kubernetes `Deployment`
for executor instances, and explains **their purpose at each location**.

---

## 1. Overview

Kubernetes metadata is divided into two categories:

### Labels
- Used by Kubernetes for **selection, routing, and scheduling**
- Participate in **Service routing**, **Deployment ownership**, and **affinity rules**
- Some label usages are **immutable** after resource creation

### Annotations
- Used for **metadata only**
- Do **not** affect routing or scheduling
- Commonly used for **debugging**, **auditing**, and **rollout triggers**

---

## 2. Deployment Metadata (`metadata.labels` & `metadata.annotations`)

```yaml
metadata:
  labels: ...
  annotations: ...
```

### Labels (Deployment Metadata)

**Purpose:**
- Identify which executor the Deployment belongs to
- Group related Kubernetes resources
- Enable filtering and querying

**Notes:**
- These labels are **not used for routing**
- They may evolve over time

---

### Annotations (Deployment Metadata)

**Purpose:**
- Store executor-related metadata:
  - executor ID
  - executor version
  - coordinator version
  - creation timestamp

**Notes:**
- Purely informational
- Changes here **do not trigger a rollout**

---

## 3. Deployment Selector (`spec.selector.matchLabels`)

```yaml
spec:
  selector:
    matchLabels: ...
```

### Labels (Selector)

**Purpose:**
- Define the set of Pods owned by the Deployment
- Establish an immutable contract between Deployment and Pods

**Critical Rules:**
- Selector labels **must never change**
- Kubernetes forbids modifying selectors after creation

---

## 4. Pod Template Metadata (`spec.template.metadata.labels`)

```yaml
spec:
  template:
    metadata:
      labels: ...
```

### Labels (Pod Labels)

**Purpose:**
- Attach labels to Pods created by the Deployment
- Allow Services to route traffic to the correct Pods
- Support scheduling rules (anti-affinity)

---

## 5. Pod Template Annotations (`spec.template.metadata.annotations`)

```yaml
spec:
  template:
    metadata:
      annotations: ...
```

### Annotations (Pod Template)

**Purpose:**
- Attach metadata directly to Pods
- Trigger rolling updates when modified

**Important Behavior:**
- Any change under `spec.template` causes Kubernetes to create a new ReplicaSet

---

## 6. Pod Anti-Affinity (`spec.template.spec.affinity`)

```yaml
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - podAffinityTerm:
          labelSelector:
            matchLabels: ...
```

### Labels (Anti-Affinity Selector)

**Purpose:**
- Identify Pods that should not be scheduled on the same node
- Distribute executor Pods across different nodes for higher availability

---

## 7. Rollout Trigger via Annotation Patch

```yaml
/spec/template/metadata/annotations/kanibot.xyz/patch-at
```

### Annotation (Rollout Trigger)

**Purpose:**
- Force Kubernetes to perform a rolling restart

**Mechanism:**
1. Annotation value is updated
2. Pod template changes
3. New ReplicaSet is created
4. Rolling update begins

---

## 8. Summary Table

| Location | Labels Used For | Annotations Used For |
|-------|----------------|---------------------|
| Deployment metadata | Resource grouping | Informational metadata |
| Deployment selector | Pod ownership | ❌ |
| Pod labels | Service routing, scheduling | ❌ |
| Pod annotations | ❌ | Rollout trigger, tracing |
| Anti-affinity | Pod placement | ❌ |

---

## 9. Key Principles

- **Selectors must be stable**
- **Pod labels must match Service selectors**
- **Annotations never affect routing**
- **Rollouts are triggered via pod template annotations**

---

## 10. One-Sentence Rule

> **Labels are used by Kubernetes to select and schedule resources.  
> Annotations are used by humans and controllers to describe and manage resources.**
