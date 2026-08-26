from database import SessionLocal
import models

db = SessionLocal()
count_before = db.query(models.Product).count()
db.query(models.Product).delete()
db.commit()
db.close()
print(f"Успешно изтрити {count_before} продукта от базата данни!")
