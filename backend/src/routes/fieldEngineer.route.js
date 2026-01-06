import { Router } from 'express';
import { FieldEngineerController } from '../controllers/fieldEngineer.controller';
const router = Router();
// Get all field engineers
router.get('/', FieldEngineerController.getAllFieldEngineers);
// Get field engineer by employee ID
router.get('/:employeeId', FieldEngineerController.getFieldEngineerByEmployeeId);
// Create new field engineer
router.post('/', FieldEngineerController.createFieldEngineer);
export default router;
